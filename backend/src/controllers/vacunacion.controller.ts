import type { Request, Response } from 'express';
import {
  getVaccinationSummary,
  listPendingVaccinations,
  listVaccinationHistory,
  listVaccinationEvents,
  markVaccinationAsPerformed,
  markVaccinationsAsPerformedBulk,
  scheduleVaccination,
} from '../services/vacunacion.service';

export async function listPendingVaccinationsController(_request: Request, response: Response) {
  const tareas = await listPendingVaccinations();

  response.status(200).json({ tareas });
}

export async function listVaccinationEventsController(_request: Request, response: Response) {
  const eventos = await listVaccinationEvents();

  response.status(200).json({ eventos });
}

export async function listVaccinationHistoryController(request: Request, response: Response) {
  const result = await listVaccinationHistory(request.query as Record<string, unknown>);

  response.status(200).json(result);
}

export async function getVaccinationSummaryController(_request: Request, response: Response) {
  const resumen = await getVaccinationSummary();

  response.status(200).json({ resumen });
}

export async function scheduleVaccinationController(request: Request, response: Response) {
  const result = await scheduleVaccination(request.body ?? {}, request.user?.id);

  response.status(201).json(result);
}

export async function markVaccinationAsPerformedController(request: Request, response: Response) {
  const tarea = await markVaccinationAsPerformed(String(request.params.id), request.body ?? {}, request.user?.id);

  response.status(200).json({ tarea });
}

export async function markVaccinationsAsPerformedBulkController(request: Request, response: Response) {
  const result = await markVaccinationsAsPerformedBulk(request.body ?? {}, request.user?.id);

  response.status(200).json(result);
}
