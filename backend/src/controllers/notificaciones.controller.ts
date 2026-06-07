import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { attendSimpleNotification, getSimpleNotifications } from '../services/notificaciones.service';

export async function getSimpleNotificationsController(request: Request, response: Response) {
  if (!request.user) {
    throw new AppError('Usuario no autenticado.', 401);
  }

  const result = await getSimpleNotifications(request.user.id, request.user.rol);

  response.status(200).json(result);
}

export async function attendSimpleNotificationController(request: Request, response: Response) {
  if (!request.user) {
    throw new AppError('Usuario no autenticado.', 401);
  }

  const result = await attendSimpleNotification(request.user.id, request.body ?? {});

  response.status(200).json(result);
}
