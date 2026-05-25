import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { findActiveUserById, findUserByUsername } from '../repositories/auth.repository';
import type { AuthTokenPayload, LoginInput } from '../types/auth.types';

const INVALID_CREDENTIALS_MESSAGE = 'Credenciales incorrectas.';

export async function login(input: LoginInput) {
  const username = input.username?.trim();
  const password = input.password;

  if (!username || !password) {
    throw new AppError('Username y password son obligatorios.', 400);
  }

  const user = await findUserByUsername(username);

  if (!user || !user.activo) {
    throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
  }

  const payload: AuthTokenPayload = {
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
  };

  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: '8h',
  });

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      username: user.username,
      rol: user.rol,
    },
  };
}

export async function getAuthenticatedUser(userId: number) {
  const user = await findActiveUserById(userId);

  if (!user) {
    throw new AppError('Usuario autenticado no encontrado o inactivo.', 401);
  }

  return user;
}
