import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { createEvento, getEvento, listEventos } from '../services/eventos.service';

export async function listEventosController(request: Request, response: Response) {
  const eventos = await listEventos(request.query);

  response.status(200).json({ eventos });
}

export async function getEventoController(request: Request, response: Response) {
  const evento = await getEvento(String(request.params.id));

  response.status(200).json({ evento });
}

export async function createEventoController(request: Request, response: Response) {
  if (!request.user) throw new AppError('Usuario no autenticado.', 401);

  const evento = await createEvento(request.body, request.user.id);

  response.status(201).json({ evento });
}
