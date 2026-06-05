import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createLoteLecheController,
  createProduccionController,
  deleteLoteLecheController,
  deleteProduccionController,
  getProduccionPorAnimalController,
  getProduccionPorLoteController,
  getProduccionPorLoteLecheController,
  getResumenProduccionController,
  listLotesLecheController,
  listProduccionesController,
  updateLoteLecheController,
} from '../controllers/produccion.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const produccionRouter = Router();

produccionRouter.get('/api/lotes-leche', authenticate, asyncHandler(listLotesLecheController));
produccionRouter.post('/api/lotes-leche', authenticate, asyncHandler(createLoteLecheController));
produccionRouter.patch('/api/lotes-leche/:id', authenticate, asyncHandler(updateLoteLecheController));
produccionRouter.delete(
  '/api/lotes-leche/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(deleteLoteLecheController),
);

produccionRouter.get('/api/produccion', authenticate, asyncHandler(listProduccionesController));
produccionRouter.get('/api/produccion/resumen', authenticate, asyncHandler(getResumenProduccionController));
produccionRouter.get('/api/produccion/por-animal/:animalId', authenticate, asyncHandler(getProduccionPorAnimalController));
produccionRouter.get('/api/produccion/por-lote/:loteId', authenticate, asyncHandler(getProduccionPorLoteController));
produccionRouter.get('/api/produccion/por-lote-leche/:loteLecheId', authenticate, asyncHandler(getProduccionPorLoteLecheController));
produccionRouter.post('/api/produccion', authenticate, asyncHandler(createProduccionController));
produccionRouter.delete(
  '/api/produccion/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(deleteProduccionController),
);
