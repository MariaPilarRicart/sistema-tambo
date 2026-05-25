import type { Request, Response } from 'express';
import { getListadosOperativos, listAgenda, listPendingAgenda } from '../services/agenda.service';

export async function listAgendaController(request: Request, response: Response) {
  const agenda = await listAgenda(request.query);

  response.status(200).json({ agenda });
}

export async function listPendingAgendaController(_request: Request, response: Response) {
  const agenda = await listPendingAgenda();

  response.status(200).json({ agenda });
}

export async function listadosOperativosController(_request: Request, response: Response) {
  const listados = await getListadosOperativos();

  response.status(200).json({ listados });
}
