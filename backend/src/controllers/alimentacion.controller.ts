import type { Request, Response } from 'express';
import {
  createNewRacion,
  createNewRegistroAlimentacion,
  deactivateExistingRacion,
  getResumenAlimentacion,
  listRaciones,
  listRegistrosAlimentacion,
  updateExistingRacion,
} from '../services/alimentacion.service';

export async function listRacionesController(_request: Request, response: Response) {
  response.status(200).json({ raciones: await listRaciones() });
}

export async function createRacionController(request: Request, response: Response) {
  const racion = await createNewRacion(request.body ?? {});
  response.status(201).json({ racion });
}

export async function updateRacionController(request: Request, response: Response) {
  const racion = await updateExistingRacion(String(request.params.id), request.body ?? {});
  response.status(200).json({ racion });
}

export async function deleteRacionController(request: Request, response: Response) {
  const racion = await deactivateExistingRacion(String(request.params.id));
  response.status(200).json({ racion });
}

export async function listRegistrosAlimentacionController(_request: Request, response: Response) {
  response.status(200).json({ registros: await listRegistrosAlimentacion() });
}

export async function createRegistroAlimentacionController(request: Request, response: Response) {
  const registro = await createNewRegistroAlimentacion(request.body ?? {}, request.user?.id);
  response.status(201).json({ registro });
}

export async function getResumenAlimentacionController(_request: Request, response: Response) {
  response.status(200).json({ resumen: await getResumenAlimentacion() });
}
