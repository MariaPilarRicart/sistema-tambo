import type { Request, Response } from 'express';
import {
  createNewInsumoAlimentacion,
  createNewMovimientoStockAlimentacion,
  createNewRacion,
  createNewRegistroAlimentacion,
  deactivateExistingInsumoAlimentacion,
  deactivateExistingRacion,
  getResumenAlimentacion,
  getResumenStockAlimentacion,
  listInsumosAlimentacion,
  listMovimientosStockAlimentacion,
  listRaciones,
  listRegistrosAlimentacion,
  updateExistingInsumoAlimentacion,
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

export async function listInsumosAlimentacionController(_request: Request, response: Response) {
  response.status(200).json({ insumos: await listInsumosAlimentacion() });
}

export async function createInsumoAlimentacionController(request: Request, response: Response) {
  const insumo = await createNewInsumoAlimentacion(request.body ?? {});
  response.status(201).json({ insumo });
}

export async function updateInsumoAlimentacionController(request: Request, response: Response) {
  const insumo = await updateExistingInsumoAlimentacion(String(request.params.id), request.body ?? {});
  response.status(200).json({ insumo });
}

export async function deleteInsumoAlimentacionController(request: Request, response: Response) {
  const insumo = await deactivateExistingInsumoAlimentacion(String(request.params.id));
  response.status(200).json({ insumo });
}

export async function listMovimientosStockAlimentacionController(_request: Request, response: Response) {
  response.status(200).json({ movimientos: await listMovimientosStockAlimentacion() });
}

export async function createMovimientoStockAlimentacionController(request: Request, response: Response) {
  const movimiento = await createNewMovimientoStockAlimentacion(request.body ?? {}, request.user?.id);
  response.status(201).json({ movimiento });
}

export async function getResumenStockAlimentacionController(_request: Request, response: Response) {
  response.status(200).json({ resumen: await getResumenStockAlimentacion() });
}
