import { Router } from 'express';
import { agendaRouter } from './agenda.routes';
import { alimentacionRouter } from './alimentacion.routes';
import { animalesRouter } from './animales.routes';
import { authRouter } from './auth.routes';
import { dashboardRouter } from './dashboard.routes';
import { eventosRouter } from './eventos.routes';
import { healthRouter } from './health.routes';
import { lotesRouter } from './lotes.routes';
import { produccionRouter } from './produccion.routes';
import { usersRouter } from './users.routes';
import { vacunacionRouter } from './vacunacion.routes';

export const routes = Router();

routes.use(healthRouter);
routes.use(authRouter);
routes.use(dashboardRouter);
routes.use(alimentacionRouter);
routes.use(animalesRouter);
routes.use(eventosRouter);
routes.use(agendaRouter);
routes.use(vacunacionRouter);
routes.use(produccionRouter);
routes.use(lotesRouter);
routes.use(usersRouter);
