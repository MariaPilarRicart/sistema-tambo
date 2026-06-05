import type { Request, Response } from 'express';
import {
  createNewLoteLeche,
  createNewProduccion,
  deleteExistingLoteLeche,
  deleteExistingProduccion,
  getProduccionPorAnimal,
  getProduccionPorLote,
  getProduccionPorLoteLeche,
  getResumenProduccion,
  getSiguienteCodigoLoteLeche,
  listLotesLeche,
  listProducciones,
  updateExistingLoteLeche,
} from '../services/produccion.service';

export async function listLotesLecheController(_request: Request, response: Response) {
  response.status(200).json(await listLotesLeche());
}

export async function getSiguienteCodigoLoteLecheController(_request: Request, response: Response) {
  response.status(200).json(await getSiguienteCodigoLoteLeche());
}

export async function createLoteLecheController(request: Request, response: Response) {
  const loteLeche = await createNewLoteLeche(request.body ?? {});
  response.status(201).json({ loteLeche });
}

export async function updateLoteLecheController(request: Request, response: Response) {
  const loteLeche = await updateExistingLoteLeche(String(request.params.id), request.body ?? {});
  response.status(200).json({ loteLeche });
}

export async function deleteLoteLecheController(request: Request, response: Response) {
  const loteLeche = await deleteExistingLoteLeche(String(request.params.id));
  response.status(200).json({ loteLeche });
}

export async function listProduccionesController(request: Request, response: Response) {
  response.status(200).json(await listProducciones(request.query as Record<string, unknown>));
}

export async function getResumenProduccionController(_request: Request, response: Response) {
  response.status(200).json({ resumen: await getResumenProduccion() });
}

export async function createProduccionController(request: Request, response: Response) {
  const produccion = await createNewProduccion(request.body ?? {}, request.user?.id);
  response.status(201).json({ produccion });
}

export async function getProduccionPorAnimalController(request: Request, response: Response) {
  response.status(200).json({ produccion: await getProduccionPorAnimal(String(request.params.animalId)) });
}

export async function getProduccionPorLoteController(request: Request, response: Response) {
  response.status(200).json({ produccion: await getProduccionPorLote(String(request.params.loteId)) });
}

export async function getProduccionPorLoteLecheController(request: Request, response: Response) {
  response.status(200).json({ produccion: await getProduccionPorLoteLeche(String(request.params.loteLecheId)) });
}

export async function deleteProduccionController(request: Request, response: Response) {
  const produccion = await deleteExistingProduccion(String(request.params.id));
  response.status(200).json({ produccion });
}
