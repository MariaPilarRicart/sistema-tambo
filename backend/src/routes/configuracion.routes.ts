import { RolUsuario } from '@prisma/client';
import { Router } from 'express';
import {
  createSanitaryRuleController,
  listSanitaryRulesController,
  updateSanitaryRuleController,
} from '../controllers/configuracion.controller';
import { asyncHandler } from '../middlewares/async-handler.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/authorize.middleware';

export const configuracionRouter = Router();

configuracionRouter.get(
  '/api/configuracion/reglas-sanitarias',
  authenticate,
  asyncHandler(listSanitaryRulesController),
);
configuracionRouter.post(
  '/api/configuracion/reglas-sanitarias',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(createSanitaryRuleController),
);
configuracionRouter.patch(
  '/api/configuracion/reglas-sanitarias/:id',
  authenticate,
  authorizeRoles(RolUsuario.ADMIN),
  asyncHandler(updateSanitaryRuleController),
);
