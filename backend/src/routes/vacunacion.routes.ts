import { Router } from 'express';
import {
  getVaccinationSummaryController,
  listVaccinationHistoryController,
  listPendingVaccinationsController,
  listVaccinationEventsController,
  scheduleVaccinationController,
} from '../controllers/vacunacion.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const vacunacionRouter = Router();

vacunacionRouter.get('/api/vacunacion', authenticate, asyncHandler(listVaccinationHistoryController));
vacunacionRouter.get('/api/vacunacion/resumen', authenticate, asyncHandler(getVaccinationSummaryController));
vacunacionRouter.post('/api/vacunacion/programar', authenticate, asyncHandler(scheduleVaccinationController));

vacunacionRouter.get('/vacunacion/tareas-pendientes', authenticate, asyncHandler(listPendingVaccinationsController));
vacunacionRouter.get('/vacunacion/eventos', authenticate, asyncHandler(listVaccinationEventsController));
vacunacionRouter.post('/vacunacion/programar', authenticate, asyncHandler(scheduleVaccinationController));
