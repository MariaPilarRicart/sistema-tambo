import type { RolUsuario } from '@prisma/client';
import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';

export function authorizeRoles(...roles: RolUsuario[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError('Usuario no autenticado.', 401));
      return;
    }

    if (!roles.includes(request.user.rol)) {
      next(new AppError('No tenes permisos para realizar esta accion.', 403));
      return;
    }

    next();
  };
}
