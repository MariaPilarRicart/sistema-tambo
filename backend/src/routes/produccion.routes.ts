import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createProduccionController,
  deleteProduccionController,
  getProduccionPorAnimalController,
  getProduccionPorLoteController,
  getResumenProduccionController,
  listProduccionesController,
} from '../controllers/produccion.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const produccionRouter = Router();

produccionRouter.get('/api/produccion', authenticate, asyncHandler(listProduccionesController));
produccionRouter.get('/api/produccion/resumen', authenticate, asyncHandler(getResumenProduccionController));
produccionRouter.get('/api/produccion/por-animal/:animalId', authenticate, asyncHandler(getProduccionPorAnimalController));
produccionRouter.get('/api/produccion/por-lote/:loteId', authenticate, asyncHandler(getProduccionPorLoteController));
produccionRouter.post('/api/produccion', authenticate, asyncHandler(createProduccionController));
produccionRouter.delete(
  '/api/produccion/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(deleteProduccionController),
);
