import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createRacionController,
  createRegistroAlimentacionController,
  deleteRacionController,
  getResumenAlimentacionController,
  listRacionesController,
  listRegistrosAlimentacionController,
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
