import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import type { AuthTokenPayload } from '../types/auth.types';

export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization) {
    next(new AppError('Token de autenticacion requerido.', 401));
    return;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(new AppError('Formato de token invalido.', 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;

    request.user = {
      id: payload.id,
      nombre: payload.nombre,
      rol: payload.rol,
    };

    next();
  } catch {
    next(new AppError('Token invalido o expirado.', 401));
  }
};
