import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createAnimalController,
  deleteAnimalController,
  getAnimalController,
  getAnimalFichaController,
  listAnimalesController,
  updateAnimalController,
} from '../controllers/animales.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const animalesRouter = Router();

animalesRouter.get('/animales', authenticate, asyncHandler(listAnimalesController));
animalesRouter.get('/animales/:id/ficha', authenticate, asyncHandler(getAnimalFichaController));
animalesRouter.get('/animales/:id', authenticate, asyncHandler(getAnimalController));
animalesRouter.post('/animales', authenticate, authorizeRoles(RolUsuario.ADMIN, RolUsuario.EMPLEADO), asyncHandler(createAnimalController));
animalesRouter.put('/animales/:id', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(updateAnimalController));
animalesRouter.delete('/animales/:id', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(deleteAnimalController));
