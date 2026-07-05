import { Router } from 'express';
import { RolUsuario } from '@prisma/client';
import {
  cancelAgendaTaskController,
  getAgendaTaskController,
  listAgendaController,
  listOpenAgendaController,
} from '../controllers/agenda.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const agendaRouter = Router();

agendaRouter.get('/agenda', authenticate, asyncHandler(listAgendaController));
agendaRouter.get('/agenda/abiertas', authenticate, asyncHandler(listOpenAgendaController));
agendaRouter.get('/agenda/:id', authenticate, asyncHandler(getAgendaTaskController));
agendaRouter.patch(
  '/agenda/:id/cancelar',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(cancelAgendaTaskController),
);
