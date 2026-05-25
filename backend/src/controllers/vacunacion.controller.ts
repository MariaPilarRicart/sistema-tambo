import type { Request, Response } from 'express';
import {
  listPendingVaccinations,
  listVaccinationEvents,
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

export async function scheduleVaccinationController(request: Request, response: Response) {
  const result = await scheduleVaccination(request.body ?? {});

  response.status(201).json(result);
}
