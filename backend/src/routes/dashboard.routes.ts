import { Router } from 'express';
import { getDashboardResumenController } from '../controllers/dashboard.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard/resumen', authenticate, asyncHandler(getDashboardResumenController));
