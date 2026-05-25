import { Router } from 'express';
import {
  listPendingVaccinationsController,
  listVaccinationEventsController,
  scheduleVaccinationController,
} from '../controllers/vacunacion.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const vacunacionRouter = Router();

vacunacionRouter.get('/vacunacion/tareas-pendientes', authenticate, asyncHandler(listPendingVaccinationsController));
vacunacionRouter.get('/vacunacion/eventos', authenticate, asyncHandler(listVaccinationEventsController));
vacunacionRouter.post('/vacunacion/programar', authenticate, asyncHandler(scheduleVaccinationController));
