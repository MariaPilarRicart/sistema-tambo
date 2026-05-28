import { apiRequest } from './apiClient';
import type {
  AlimentacionResumen,
  InsumoAlimentacion,
  InsumoAlimentacionFormValues,
  MovimientoStockAlimentacion,
  MovimientoStockAlimentacionFormValues,
  Racion,
  RacionFormValues,
  RegistroAlimentacion,
  RegistroAlimentacionFormValues,
  StockAlimentacionResumen,
} from '../types/alimentacion';

interface RacionesResponse {
  raciones: Racion[];
}

interface RacionResponse {
  racion: Racion;
}

interface RegistrosResponse {
  registros: RegistroAlimentacion[];
}

interface RegistroResponse {
  registro: RegistroAlimentacion;
}

interface ResumenResponse {
  resumen: AlimentacionResumen;
}

interface InsumosResponse {
  insumos: InsumoAlimentacion[];
}

interface InsumoResponse {
  insumo: InsumoAlimentacion;
}

interface MovimientosStockResponse {
  movimientos: MovimientoStockAlimentacion[];
}

interface MovimientoStockResponse {
  movimiento: MovimientoStockAlimentacion;
}

interface ResumenStockResponse {
  resumen: StockAlimentacionResumen;
}

function buildRacionPayload(values: RacionFormValues) {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
    activa: values.activa,
  };
}

function buildRegistroPayload(values: RegistroAlimentacionFormValues) {
  return {
    fecha: values.fecha,
    loteId: Number(values.loteId),
    racionId: Number(values.racionId),
    cantidadKg: Number(values.cantidadKg),
    observaciones: values.observaciones.trim() || null,
  };
}

function buildInsumoPayload(values: InsumoAlimentacionFormValues) {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
    unidadMedida: values.unidadMedida.trim(),
    stockMinimo: Number(values.stockMinimo || 0),
    activo: values.activo,
  };
}

function buildMovimientoStockPayload(values: MovimientoStockAlimentacionFormValues) {
  return {
    fecha: values.fecha,
    insumoId: Number(values.insumoId),
    tipoMovimiento: values.tipoMovimiento,
    cantidad: Number(values.cantidad),
    observaciones: values.observaciones.trim() || null,
  };
}

export async function getRaciones(token: string) {
  const response = await apiRequest<RacionesResponse>('/alimentacion/raciones', { token });
  return response.raciones;
}

export async function createRacion(token: string, values: RacionFormValues) {
  const response = await apiRequest<RacionResponse>('/alimentacion/raciones', {
    method: 'POST',
    token,
    body: JSON.stringify(buildRacionPayload(values)),
  });
  return response.racion;
}

export async function updateRacion(token: string, id: number, values: RacionFormValues) {
  const response = await apiRequest<RacionResponse>(`/alimentacion/raciones/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(buildRacionPayload(values)),
  });
  return response.racion;
}

export async function deactivateRacion(token: string, id: number) {
  const response = await apiRequest<RacionResponse>(`/alimentacion/raciones/${id}`, {
    method: 'DELETE',
    token,
  });
  return response.racion;
}

export async function getRegistrosAlimentacion(token: string) {
  const response = await apiRequest<RegistrosResponse>('/alimentacion/registros', { token });
  return response.registros;
}

export async function createRegistroAlimentacion(token: string, values: RegistroAlimentacionFormValues) {
  const response = await apiRequest<RegistroResponse>('/alimentacion/registros', {
    method: 'POST',
    token,
    body: JSON.stringify(buildRegistroPayload(values)),
  });
  return response.registro;
}

export async function getResumenAlimentacion(token: string) {
  const response = await apiRequest<ResumenResponse>('/alimentacion/resumen', { token });
  return response.resumen;
}

export async function getInsumosAlimentacion(token: string) {
  const response = await apiRequest<InsumosResponse>('/alimentacion/insumos', { token });
  return response.insumos;
}

export async function createInsumoAlimentacion(token: string, values: InsumoAlimentacionFormValues) {
  const response = await apiRequest<InsumoResponse>('/alimentacion/insumos', {
    method: 'POST',
    token,
    body: JSON.stringify(buildInsumoPayload(values)),
  });
  return response.insumo;
}

export async function updateInsumoAlimentacion(token: string, id: number, values: InsumoAlimentacionFormValues) {
  const response = await apiRequest<InsumoResponse>(`/alimentacion/insumos/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(buildInsumoPayload(values)),
  });
  return response.insumo;
}

export async function deactivateInsumoAlimentacion(token: string, id: number) {
  const response = await apiRequest<InsumoResponse>(`/alimentacion/insumos/${id}`, {
    method: 'DELETE',
    token,
  });
  return response.insumo;
}

export async function getMovimientosStockAlimentacion(token: string) {
  const response = await apiRequest<MovimientosStockResponse>('/alimentacion/stock/movimientos', { token });
  return response.movimientos;
}

export async function createMovimientoStockAlimentacion(
  token: string,
  values: MovimientoStockAlimentacionFormValues,
) {
  const response = await apiRequest<MovimientoStockResponse>('/alimentacion/stock/movimientos', {
    method: 'POST',
    token,
    body: JSON.stringify(buildMovimientoStockPayload(values)),
  });
  return response.movimiento;
}

export async function getResumenStockAlimentacion(token: string) {
  const response = await apiRequest<ResumenStockResponse>('/alimentacion/stock/resumen', { token });
  return response.resumen;
}
