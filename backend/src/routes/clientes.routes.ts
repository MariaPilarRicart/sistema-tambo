import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createClienteController,
  getClienteController,
  listClientesController,
  updateClienteController,
  updateClienteEstadoController,
} from '../controllers/clientes.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const clientesRouter = Router();

clientesRouter.get('/api/clientes', authenticate, asyncHandler(listClientesController));
clientesRouter.get('/api/clientes/:id', authenticate, asyncHandler(getClienteController));
clientesRouter.post('/api/clientes', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(createClienteController));
clientesRouter.patch('/api/clientes/:id', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(updateClienteController));
clientesRouter.patch(
  '/api/clientes/:id/estado',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(updateClienteEstadoController),
);

