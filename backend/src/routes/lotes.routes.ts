import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createLoteController,
  deleteLoteController,
  listLotesController,
  updateLoteController,
} from '../controllers/lotes.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const lotesRouter = Router();

lotesRouter.get('/lotes', authenticate, asyncHandler(listLotesController));
lotesRouter.post('/lotes', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(createLoteController));
lotesRouter.put('/lotes/:id', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(updateLoteController));
lotesRouter.delete('/lotes/:id', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(deleteLoteController));
