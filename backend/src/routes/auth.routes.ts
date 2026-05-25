import { Router } from 'express';
import { loginController, meController } from '../controllers/auth.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const authRouter = Router();

authRouter.post('/auth/login', asyncHandler(loginController));
authRouter.get('/auth/me', authenticate, asyncHandler(meController));
