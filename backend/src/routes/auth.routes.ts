import { Router } from 'express';
import { changePasswordController, changeRequiredPasswordController, loginController, meController, updateProfileController } from '../controllers/auth.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const authRouter = Router();

authRouter.post('/auth/login', asyncHandler(loginController));
authRouter.get('/auth/me', authenticate, asyncHandler(meController));
authRouter.patch('/auth/profile', authenticate, asyncHandler(updateProfileController));
authRouter.post('/auth/change-password', authenticate, asyncHandler(changePasswordController));
authRouter.post('/auth/change-required-password', authenticate, asyncHandler(changeRequiredPasswordController));
