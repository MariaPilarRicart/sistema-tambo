import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createVentaController,
  getVentaController,
  listLotesDisponiblesVentaController,
  listVentasController,
} from '../controllers/ventas.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const ventasRouter = Router();

ventasRouter.use('/api/ventas', authenticate, authorizeRoles(RolUsuario.ADMIN));

ventasRouter.get('/api/ventas', asyncHandler(listVentasController));
ventasRouter.get('/api/ventas/lotes-disponibles', asyncHandler(listLotesDisponiblesVentaController));
ventasRouter.get('/api/ventas/:id', asyncHandler(getVentaController));
ventasRouter.post('/api/ventas', asyncHandler(createVentaController));

