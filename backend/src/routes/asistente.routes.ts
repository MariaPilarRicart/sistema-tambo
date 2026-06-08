import { Router } from 'express';
import { chatAsistenteController } from '../controllers/asistente.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const asistenteRouter = Router();

asistenteRouter.post('/api/asistente/chat', authenticate, asyncHandler(chatAsistenteController));
