import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createUserController,
  deleteUserController,
  listUsersController,
  resetUserPasswordController,
  updateUserController,
} from '../controllers/users.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const usersRouter = Router();

usersRouter.use(authenticate, authorizeRoles(RolUsuario.ADMIN));

usersRouter.get('/users', asyncHandler(listUsersController));
usersRouter.post('/users', asyncHandler(createUserController));
usersRouter.put('/users/:id', asyncHandler(updateUserController));
usersRouter.post('/users/:id/reset-password', asyncHandler(resetUserPasswordController));
usersRouter.delete('/users/:id', asyncHandler(deleteUserController));
