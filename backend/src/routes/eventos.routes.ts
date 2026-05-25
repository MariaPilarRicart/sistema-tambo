import { Router } from 'express';
import {
  createEventoController,
  getEventoController,
  listEventosController,
} from '../controllers/eventos.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const eventosRouter = Router();

eventosRouter.get('/eventos', authenticate, asyncHandler(listEventosController));
eventosRouter.get('/eventos/:id', authenticate, asyncHandler(getEventoController));
eventosRouter.post('/eventos', authenticate, asyncHandler(createEventoController));
