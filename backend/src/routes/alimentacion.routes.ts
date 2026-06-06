import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createAlimentoController,
  createMovimientoStockController,
  createReglaAlimentacionController,
  getResumenAlimentacionController,
  getSugerenciaAlimentacionController,
  listAlimentosController,
  listHistorialAlimentacionController,
  listMovimientosStockController,
  listReglasAlimentacionController,
  listStockController,
  registrarAlimentacionController,
  updateAlimentoController,
  updateReglaAlimentacionController,
} from '../controllers/alimentacion.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const alimentacionRouter = Router();

alimentacionRouter.get('/api/alimentacion/resumen', authenticate, asyncHandler(getResumenAlimentacionController));

alimentacionRouter.get('/api/alimentacion/reglas', authenticate, asyncHandler(listReglasAlimentacionController));
alimentacionRouter.post(
  '/api/alimentacion/reglas',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(createReglaAlimentacionController),
);
alimentacionRouter.patch(
  '/api/alimentacion/reglas/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(updateReglaAlimentacionController),
);

alimentacionRouter.get('/api/alimentacion/alimentos', authenticate, asyncHandler(listAlimentosController));
alimentacionRouter.post(
  '/api/alimentacion/alimentos',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(createAlimentoController),
);
alimentacionRouter.patch(
  '/api/alimentacion/alimentos/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(updateAlimentoController),
);

alimentacionRouter.get('/api/alimentacion/stock', authenticate, asyncHandler(listStockController));
alimentacionRouter.patch(
  '/api/alimentacion/stock/:alimentoId/movimiento',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(createMovimientoStockController),
);
alimentacionRouter.get('/api/alimentacion/movimientos-stock', authenticate, asyncHandler(listMovimientosStockController));
alimentacionRouter.get('/api/alimentacion/sugerencia', authenticate, asyncHandler(getSugerenciaAlimentacionController));
alimentacionRouter.post('/api/alimentacion/registrar', authenticate, asyncHandler(registrarAlimentacionController));
alimentacionRouter.get('/api/alimentacion/historial', authenticate, asyncHandler(listHistorialAlimentacionController));

// Compatibilidad con rutas previas usadas por pantallas antiguas.
alimentacionRouter.get('/alimentacion/resumen', authenticate, asyncHandler(getResumenAlimentacionController));
alimentacionRouter.get('/alimentacion/insumos', authenticate, asyncHandler(listAlimentosController));
alimentacionRouter.get('/alimentacion/stock/resumen', authenticate, asyncHandler(getResumenAlimentacionController));
alimentacionRouter.get('/alimentacion/stock/movimientos', authenticate, asyncHandler(listMovimientosStockController));
alimentacionRouter.get('/alimentacion/registros', authenticate, asyncHandler(listHistorialAlimentacionController));
