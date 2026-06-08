import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { findActiveUserById, findUserByUsername } from '../repositories/auth.repository';
import type { AuthTokenPayload, LoginInput } from '../types/auth.types';

const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos.';
const MIN_PASSWORD_LENGTH = 8;

function assertPasswordPolicy(password: unknown) {
  if (typeof password !== 'string' || !password.trim()) {
    throw new AppError('La nueva contraseña no puede estar vacía.', 400);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`, 400);
  }
}

function publicUser(user: {
  id: number;
  nombre: string;
  username: string;
  email?: string | null;
  rol: string;
  activo?: boolean;
  createdAt?: Date | string | null;
  debeCambiarPassword?: boolean;
  fotoPerfil?: string | null;
}) {
  return {
    id: user.id,
    nombre: user.nombre,
    username: user.username,
    email: user.email ?? null,
    rol: user.rol,
    activo: user.activo ?? true,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    debeCambiarPassword: Boolean(user.debeCambiarPassword),
    fotoPerfil: user.fotoPerfil ?? null,
  };
}

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
    user: publicUser(user),
  };
}

export async function getAuthenticatedUser(userId: number) {
  const user = await findActiveUserById(userId);

  if (!user) {
    throw new AppError('Usuario autenticado no encontrado o inactivo.', 401);
  }

  return user;
}

export async function updateOwnProfile(userId: number, input: { nombre?: string; email?: string | null; fotoPerfil?: string | null }) {
  const nombre = input.nombre?.trim();
  const email = input.email?.trim() ?? null;

  if (input.nombre !== undefined && !nombre) {
    throw new AppError('Nombre no puede estar vacío.', 400);
  }

  if (input.email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Email inválido.', 400);
  }

  if (input.fotoPerfil && !input.fotoPerfil.startsWith('data:image/')) {
    throw new AppError('Formato de foto inválido.', 400);
  }

  const user = await prisma.usuario.update({
    where: { id: userId },
    data: {
      ...(nombre ? { nombre } : {}),
      ...(input.email !== undefined ? { email } : {}),
      ...(input.fotoPerfil !== undefined ? { fotoPerfil: input.fotoPerfil } : {}),
    },
    select: {
      id: true,
      nombre: true,
      username: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
      debeCambiarPassword: true,
      fotoPerfil: true,
    },
  });

  return publicUser(user);
}

export async function changeOwnPassword(
  userId: number,
  input: { currentPassword?: string; newPassword?: string; confirmPassword?: string },
) {
  assertPasswordPolicy(input.newPassword);
  const newPassword = input.newPassword as string;

  if (newPassword !== input.confirmPassword) {
    throw new AppError('La nueva contraseña y la confirmación no coinciden.', 400);
  }

  const user = await prisma.usuario.findFirst({ where: { id: userId, activo: true } });

  if (!user) {
    throw new AppError('Usuario autenticado no encontrado o inactivo.', 401);
  }

  if (!user.debeCambiarPassword && !input.currentPassword) {
    throw new AppError('La contraseña actual es obligatoria.', 400);
  }

  const passwordMatches = user.debeCambiarPassword || await bcrypt.compare(input.currentPassword as string, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError('La contraseña actual es incorrecta.', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash, debeCambiarPassword: false },
    select: {
      id: true,
      nombre: true,
      username: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
      debeCambiarPassword: true,
      fotoPerfil: true,
    },
  });

  return publicUser(updated);
}

export async function changeRequiredPassword(
  userId: number,
  input: { newPassword?: string; confirmPassword?: string },
) {
  assertPasswordPolicy(input.newPassword);
  const newPassword = input.newPassword as string;

  if (newPassword !== input.confirmPassword) {
    throw new AppError('Las contraseñas no coinciden.', 400);
  }

  const user = await prisma.usuario.findFirst({ where: { id: userId, activo: true } });

  if (!user) {
    throw new AppError('Usuario autenticado no encontrado o inactivo.', 401);
  }

  if (!user.debeCambiarPassword) {
    throw new AppError('No tenés un cambio obligatorio de contraseña pendiente.', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash, debeCambiarPassword: false },
    select: {
      id: true,
      nombre: true,
      username: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
      debeCambiarPassword: true,
      fotoPerfil: true,
    },
  });

  return publicUser(updated);
}
