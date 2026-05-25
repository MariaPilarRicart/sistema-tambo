import { Router } from 'express';
import { listAgendaController, listPendingAgendaController } from '../controllers/agenda.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const agendaRouter = Router();

agendaRouter.get('/agenda', authenticate, asyncHandler(listAgendaController));
agendaRouter.get('/agenda/pendientes', authenticate, asyncHandler(listPendingAgendaController));
