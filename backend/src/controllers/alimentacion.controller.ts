import type { Request, Response } from 'express';
import {
  createMovimientoStock,
  createNewAlimento,
  createNewRegla,
  getResumenAlimentacion,
  getSugerenciaAlimentacion,
  listAlimentos,
  listHistorial,
  listMovimientos,
  listReglas,
  listStock,
  registrarAlimentacion,
  updateExistingAlimento,
  updateExistingRegla,
} from '../services/alimentacion.service';

export async function getResumenAlimentacionController(_request: Request, response: Response) {
  response.status(200).json({ resumen: await getResumenAlimentacion() });
}

export async function listReglasAlimentacionController(_request: Request, response: Response) {
  response.status(200).json({ reglas: await listReglas() });
}

export async function createReglaAlimentacionController(request: Request, response: Response) {
  response.status(201).json({ regla: await createNewRegla(request.body ?? {}) });
}

export async function updateReglaAlimentacionController(request: Request, response: Response) {
  response.status(200).json({ regla: await updateExistingRegla(String(request.params.id), request.body ?? {}) });
}

export async function listAlimentosController(request: Request, response: Response) {
  response.status(200).json({ alimentos: await listAlimentos(request.query) });
}

export async function createAlimentoController(request: Request, response: Response) {
  response.status(201).json({ alimento: await createNewAlimento(request.body ?? {}) });
}

export async function updateAlimentoController(request: Request, response: Response) {
  response.status(200).json({
    alimento: await updateExistingAlimento(String(request.params.id), request.body ?? {}, request.user?.id),
  });
}

export async function listStockController(request: Request, response: Response) {
  response.status(200).json({ stock: await listStock(request.query) });
}

export async function createMovimientoStockController(request: Request, response: Response) {
  response.status(201).json({
    movimiento: await createMovimientoStock(
      { ...(request.body ?? {}), alimentoId: request.params.alimentoId ?? request.body?.alimentoId },
      request.user?.id,
    ),
  });
}

export async function listMovimientosStockController(request: Request, response: Response) {
  response.status(200).json({ movimientos: await listMovimientos(request.query) });
}

export async function getSugerenciaAlimentacionController(request: Request, response: Response) {
  response.status(200).json({ sugerencia: await getSugerenciaAlimentacion(request.query) });
}

export async function registrarAlimentacionController(request: Request, response: Response) {
  response.status(201).json({ registro: await registrarAlimentacion(request.body ?? {}, request.user?.id) });
}

export async function listHistorialAlimentacionController(request: Request, response: Response) {
  response.status(200).json({ registros: await listHistorial(request.query) });
}
