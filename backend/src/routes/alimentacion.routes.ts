import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createInsumoAlimentacionController,
  createMovimientoStockAlimentacionController,
  createRacionController,
  createRegistroAlimentacionController,
  deleteInsumoAlimentacionController,
  deleteRacionController,
  getResumenAlimentacionController,
  getResumenStockAlimentacionController,
  listInsumosAlimentacionController,
  listMovimientosStockAlimentacionController,
  listRacionesController,
  listRegistrosAlimentacionController,
  updateInsumoAlimentacionController,
  updateRacionController,
} from '../controllers/alimentacion.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const alimentacionRouter = Router();

alimentacionRouter.get('/alimentacion/raciones', authenticate, asyncHandler(listRacionesController));
alimentacionRouter.post(
  '/alimentacion/raciones',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(createRacionController),
);
alimentacionRouter.put(
  '/alimentacion/raciones/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(updateRacionController),
);
alimentacionRouter.delete(
  '/alimentacion/raciones/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(deleteRacionController),
);

alimentacionRouter.get('/alimentacion/registros', authenticate, asyncHandler(listRegistrosAlimentacionController));
alimentacionRouter.post('/alimentacion/registros', authenticate, asyncHandler(createRegistroAlimentacionController));
alimentacionRouter.get('/alimentacion/resumen', authenticate, asyncHandler(getResumenAlimentacionController));

alimentacionRouter.get('/alimentacion/insumos', authenticate, asyncHandler(listInsumosAlimentacionController));
alimentacionRouter.post(
  '/alimentacion/insumos',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(createInsumoAlimentacionController),
);
alimentacionRouter.put(
  '/alimentacion/insumos/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(updateInsumoAlimentacionController),
);
alimentacionRouter.delete(
  '/alimentacion/insumos/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(deleteInsumoAlimentacionController),
);

alimentacionRouter.get(
  '/alimentacion/stock/movimientos',
  authenticate,
  asyncHandler(listMovimientosStockAlimentacionController),
);
alimentacionRouter.post(
  '/alimentacion/stock/movimientos',
  authenticate,
  asyncHandler(createMovimientoStockAlimentacionController),
);
alimentacionRouter.get('/alimentacion/stock/resumen', authenticate, asyncHandler(getResumenStockAlimentacionController));
