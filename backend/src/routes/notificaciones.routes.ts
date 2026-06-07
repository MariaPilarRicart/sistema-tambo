import { Router } from 'express';
import { attendSimpleNotificationController, getSimpleNotificationsController } from '../controllers/notificaciones.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const notificacionesRouter = Router();

notificacionesRouter.get('/api/notificaciones', authenticate, asyncHandler(getSimpleNotificationsController));
notificacionesRouter.patch('/api/notificaciones/atender', authenticate, asyncHandler(attendSimpleNotificationController));
