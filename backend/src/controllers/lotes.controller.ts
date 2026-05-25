import type { Request, Response } from 'express';
import { createNewLote, deactivateExistingLote, listLotes, updateExistingLote } from '../services/lotes.service';

export async function listLotesController(_request: Request, response: Response) {
  const lotes = await listLotes();

  response.status(200).json({ lotes });
}

export async function createLoteController(request: Request, response: Response) {
  const lote = await createNewLote(request.body);

  response.status(201).json({ lote });
}

export async function updateLoteController(request: Request, response: Response) {
  const lote = await updateExistingLote(String(request.params.id), request.body);

  response.status(200).json({ lote });
}

export async function deleteLoteController(request: Request, response: Response) {
  const lote = await deactivateExistingLote(String(request.params.id));

  response.status(200).json({ lote });
}
