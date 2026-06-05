import { Router } from 'express';
import {
  createVentaController,
  getVentaController,
  listLotesDisponiblesVentaController,
  listVentasController,
} from '../controllers/ventas.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const ventasRouter = Router();

ventasRouter.get('/api/ventas', authenticate, asyncHandler(listVentasController));
ventasRouter.get('/api/ventas/lotes-disponibles', authenticate, asyncHandler(listLotesDisponiblesVentaController));
ventasRouter.get('/api/ventas/:id', authenticate, asyncHandler(getVentaController));
ventasRouter.post('/api/ventas', authenticate, asyncHandler(createVentaController));

