import { Router } from 'express';
import { RolUsuario } from '@prisma/client';
import { getDashboardEmpleadoController, getDashboardResumenController } from '../controllers/dashboard.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard/resumen', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(getDashboardResumenController));
dashboardRouter.get('/api/dashboard/admin', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(getDashboardResumenController));
dashboardRouter.get(
  '/dashboard/empleado',
  authenticate,
  authorizeRoles(RolUsuario.EMPLEADO),
  asyncHandler(getDashboardEmpleadoController),
);
