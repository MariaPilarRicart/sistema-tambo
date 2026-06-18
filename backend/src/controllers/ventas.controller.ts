import type { Request, Response } from 'express';
import {
  createNewEntrega,
  createNewLiquidacion,
  deleteExistingEntrega,
  getResumenVentas,
  getSugerenciaLiquidacion,
  listEntregas,
  listLiquidaciones,
  listOrdenesDisponibles,
  updateExistingEntrega,
  updateExistingLiquidacion,
} from '../services/ventas.service';

export async function getResumenVentasController(_request: Request, response: Response) {
  response.status(200).json({ resumen: await getResumenVentas() });
}

export async function listEntregasController(request: Request, response: Response) {
  response.status(200).json({ entregas: await listEntregas(request.query as Record<string, unknown>) });
}

export async function createEntregaController(request: Request, response: Response) {
  response.status(201).json({ entrega: await createNewEntrega(request.body ?? {}, request.user?.id) });
}

export async function updateEntregaController(request: Request, response: Response) {
  response.status(200).json({ entrega: await updateExistingEntrega(String(request.params.id), request.body ?? {}) });
}

export async function deleteEntregaController(request: Request, response: Response) {
  response.status(200).json({ entrega: await deleteExistingEntrega(String(request.params.id)) });
}

export async function listOrdenesDisponiblesController(_request: Request, response: Response) {
  response.status(200).json({ ordenes: await listOrdenesDisponibles() });
}

export async function listLiquidacionesController(request: Request, response: Response) {
  response.status(200).json({ liquidaciones: await listLiquidaciones(request.query as Record<string, unknown>) });
}

export async function getSugerenciaLiquidacionController(request: Request, response: Response) {
  response.status(200).json({ sugerencia: await getSugerenciaLiquidacion(request.query as Record<string, unknown>) });
}

export async function createLiquidacionController(request: Request, response: Response) {
  response.status(201).json({ liquidacion: await createNewLiquidacion(request.body ?? {}, request.user?.id) });
}

export async function updateLiquidacionController(request: Request, response: Response) {
  response.status(200).json({ liquidacion: await updateExistingLiquidacion(String(request.params.id), request.body ?? {}) });
}
