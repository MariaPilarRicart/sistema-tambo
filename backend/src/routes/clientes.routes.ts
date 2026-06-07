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

clientesRouter.use('/api/clientes', authenticate, authorizeRoles(RolUsuario.ADMIN));

clientesRouter.get('/api/clientes', asyncHandler(listClientesController));
clientesRouter.get('/api/clientes/:id', asyncHandler(getClienteController));
clientesRouter.post('/api/clientes', asyncHandler(createClienteController));
clientesRouter.patch('/api/clientes/:id', asyncHandler(updateClienteController));
clientesRouter.patch(
  '/api/clientes/:id/estado',
  asyncHandler(updateClienteEstadoController),
);

