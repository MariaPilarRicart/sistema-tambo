import type { Request, Response } from 'express';
import {
  cancelExistingAgendaTask,
  getAgendaTask,
  listAgenda,
  listPendingAgenda,
} from '../services/agenda.service';

export async function listAgendaController(request: Request, response: Response) {
  const agenda = await listAgenda(request.query);

  response.status(200).json({ agenda });
}

export async function listPendingAgendaController(_request: Request, response: Response) {
  const agenda = await listPendingAgenda();

  response.status(200).json({ agenda });
}

export async function getAgendaTaskController(request: Request, response: Response) {
  const tarea = await getAgendaTask(String(request.params.id));

  response.status(200).json({ tarea });
}

export async function cancelAgendaTaskController(request: Request, response: Response) {
  const tarea = await cancelExistingAgendaTask(String(request.params.id), request.body ?? {});

  response.status(200).json({ tarea });
}
