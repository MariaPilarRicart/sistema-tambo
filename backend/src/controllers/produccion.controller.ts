import type { Request, Response } from 'express';
import {
  createNewProduccion,
  deleteExistingProduccion,
  getProduccionPorAnimal,
  getProduccionPorLote,
  getResumenProduccion,
  listProducciones,
} from '../services/produccion.service';

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

export async function deleteProduccionController(request: Request, response: Response) {
  const produccion = await deleteExistingProduccion(String(request.params.id));
  response.status(200).json({ produccion });
}
