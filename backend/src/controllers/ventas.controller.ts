import type { Request, Response } from 'express';
import {
  createNewVenta,
  getVenta,
  listLotesDisponiblesParaVenta,
  listVentas,
} from '../services/ventas.service';

export async function listVentasController(request: Request, response: Response) {
  response.status(200).json({ ventas: await listVentas(request.query as Record<string, unknown>) });
}

export async function getVentaController(request: Request, response: Response) {
  response.status(200).json({ venta: await getVenta(String(request.params.id)) });
}

export async function createVentaController(request: Request, response: Response) {
  response.status(201).json({ venta: await createNewVenta(request.body ?? {}, request.user?.id) });
}

export async function listLotesDisponiblesVentaController(_request: Request, response: Response) {
  response.status(200).json({ lotesLeche: await listLotesDisponiblesParaVenta() });
}

