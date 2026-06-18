import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createEntregaController,
  createLiquidacionController,
  deleteEntregaController,
  getResumenVentasController,
  getSugerenciaLiquidacionController,
  listEntregasController,
  listLiquidacionesController,
  listOrdenesDisponiblesController,
  updateEntregaController,
} from '../controllers/ventas.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const ventasRouter = Router();

ventasRouter.use('/api/ventas', authenticate, authorizeRoles(RolUsuario.ADMIN));

ventasRouter.get('/api/ventas/resumen', asyncHandler(getResumenVentasController));
ventasRouter.get('/api/ventas/ordenes-disponibles', asyncHandler(listOrdenesDisponiblesController));
ventasRouter.get('/api/ventas/entregas', asyncHandler(listEntregasController));
ventasRouter.post('/api/ventas/entregas', asyncHandler(createEntregaController));
ventasRouter.patch('/api/ventas/entregas/:id', asyncHandler(updateEntregaController));
ventasRouter.delete('/api/ventas/entregas/:id', asyncHandler(deleteEntregaController));
ventasRouter.get('/api/ventas/liquidaciones', asyncHandler(listLiquidacionesController));
ventasRouter.get('/api/ventas/liquidaciones/sugerencia', asyncHandler(getSugerenciaLiquidacionController));
ventasRouter.post('/api/ventas/liquidaciones', asyncHandler(createLiquidacionController));
