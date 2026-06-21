import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  getVaccinationSummaryController,
  getPendienteSanitarioDetalleController,
  listAplicacionesSanitariasController,
  listPendientesSanitariosController,
  listVaccinationHistoryController,
  listPendingVaccinationsController,
  listVaccinationEventsController,
  marcarPendienteSanitarioRealizadoController,
  markVaccinationAsPerformedController,
  markVaccinationsAsPerformedBulkController,
  scheduleVaccinationController,
} from '../controllers/vacunacion.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const vacunacionRouter = Router();

vacunacionRouter.get('/api/vacunacion', authenticate, asyncHandler(listVaccinationHistoryController));
vacunacionRouter.get('/api/vacunacion/resumen', authenticate, asyncHandler(getVaccinationSummaryController));
vacunacionRouter.get('/api/vacunacion/pendientes-sanitarios', authenticate, asyncHandler(listPendientesSanitariosController));
vacunacionRouter.get('/api/vacunacion/pendientes-sanitarios/:id', authenticate, asyncHandler(getPendienteSanitarioDetalleController));
vacunacionRouter.patch('/api/vacunacion/pendientes-sanitarios/:id/realizar', authenticate, authorizeRoles(RolUsuario.ADMIN, RolUsuario.EMPLEADO), asyncHandler(marcarPendienteSanitarioRealizadoController));
vacunacionRouter.get('/api/vacunacion/aplicaciones-sanitarias', authenticate, asyncHandler(listAplicacionesSanitariasController));
vacunacionRouter.post('/api/vacunacion/programar', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(scheduleVaccinationController));
vacunacionRouter.patch('/api/vacunacion/realizar-masivo', authenticate, authorizeRoles(RolUsuario.ADMIN, RolUsuario.EMPLEADO), asyncHandler(markVaccinationsAsPerformedBulkController));
vacunacionRouter.patch('/api/vacunacion/:id/realizar', authenticate, authorizeRoles(RolUsuario.ADMIN, RolUsuario.EMPLEADO), asyncHandler(markVaccinationAsPerformedController));

vacunacionRouter.get('/vacunacion/tareas-pendientes', authenticate, asyncHandler(listPendingVaccinationsController));
vacunacionRouter.get('/vacunacion/eventos', authenticate, asyncHandler(listVaccinationEventsController));
vacunacionRouter.post('/vacunacion/programar', authenticate, authorizeRoles(RolUsuario.ADMIN), asyncHandler(scheduleVaccinationController));
