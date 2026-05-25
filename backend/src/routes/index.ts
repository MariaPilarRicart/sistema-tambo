import { Router } from 'express';
import { agendaRouter } from './agenda.routes';
import { animalesRouter } from './animales.routes';
import { authRouter } from './auth.routes';
import { eventosRouter } from './eventos.routes';
import { healthRouter } from './health.routes';
import { lotesRouter } from './lotes.routes';
import { usersRouter } from './users.routes';

export const routes = Router();

routes.use(healthRouter);
routes.use(authRouter);
routes.use(animalesRouter);
routes.use(eventosRouter);
routes.use(agendaRouter);
routes.use(lotesRouter);
routes.use(usersRouter);
