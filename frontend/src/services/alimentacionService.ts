import { apiRequest } from './apiClient';
import type {
  AlimentacionResumen,
  Alimento,
  AlimentoFormValues,
  MovimientoStockAlimentacion,
  ReglaAlimentacion,
  ReglaAlimentacionFormValues,
  RegistrarAlimentacionPayload,
  RegistroAlimentacion,
  SugerenciaAlimentacion,
} from '../types/alimentacion';

interface ResumenResponse { resumen: AlimentacionResumen }
interface AlimentosResponse { alimentos: Alimento[] }
interface AlimentoResponse { alimento: Alimento }
interface StockResponse { stock: Alimento[] }
interface ReglasResponse { reglas: ReglaAlimentacion[] }
interface ReglaResponse { regla: ReglaAlimentacion }
interface SugerenciaResponse { sugerencia: SugerenciaAlimentacion }
interface RegistroResponse { registro: RegistroAlimentacion }
interface RegistrosResponse { registros: RegistroAlimentacion[] }
interface MovimientosResponse { movimientos: MovimientoStockAlimentacion[] }
interface MovimientoResponse { movimiento: MovimientoStockAlimentacion }

function queryString(filters: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildAlimentoPayload(values: AlimentoFormValues) {
  return {
    nombre: values.nombre.trim(),
    tipoAlimento: values.tipoAlimento,
    unidad: values.unidad,
    stockActual: Number(values.stockActual || 0),
    puntoStockMinimo: Number(values.puntoStockMinimo || 0),
    activo: values.activo,
    observaciones: values.observaciones.trim() || null,
  };
}

function buildReglaPayload(values: ReglaAlimentacionFormValues) {
  return {
    nombre: values.nombre.trim(),
    categoriaAnimal: values.categoriaAnimal,
    activo: values.activo,
    observaciones: values.observaciones.trim() || null,
    detalles: values.detalles.map((detalle) => ({
      alimentoId: Number(detalle.alimentoId),
      tipoCalculo: detalle.tipoCalculo,
      unidad: detalle.unidad,
      cantidadMinima: detalle.cantidadMinima === '' ? null : Number(detalle.cantidadMinima),
      cantidadMaxima: detalle.cantidadMaxima === '' ? null : Number(detalle.cantidadMaxima),
      animalesBase: detalle.animalesBase === '' ? null : Number(detalle.animalesBase),
      rollosBase: detalle.rollosBase === '' ? null : Number(detalle.rollosBase),
      duracionDias: detalle.duracionDias === '' ? null : Number(detalle.duracionDias),
      obligatorio: detalle.obligatorio,
      observaciones: detalle.observaciones.trim() || null,
    })),
  };
}

export async function getResumenAlimentacion(token: string) {
  return (await apiRequest<ResumenResponse>('/api/alimentacion/resumen', { token })).resumen;
}

export async function getAlimentos(token: string, filters: Record<string, string | boolean> = {}) {
  return (await apiRequest<AlimentosResponse>(`/api/alimentacion/alimentos${queryString(filters)}`, { token })).alimentos;
}

export async function createAlimento(token: string, values: AlimentoFormValues) {
  return (await apiRequest<AlimentoResponse>('/api/alimentacion/alimentos', {
    method: 'POST',
    token,
    body: JSON.stringify(buildAlimentoPayload(values)),
  })).alimento;
}

export async function updateAlimento(token: string, id: number, values: AlimentoFormValues) {
  return (await apiRequest<AlimentoResponse>(`/api/alimentacion/alimentos/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ ...buildAlimentoPayload(values), observacionesMovimiento: values.observaciones.trim() || null }),
  })).alimento;
}

export async function getReglasAlimentacion(token: string) {
  return (await apiRequest<ReglasResponse>('/api/alimentacion/reglas', { token })).reglas;
}

export async function createReglaAlimentacion(token: string, values: ReglaAlimentacionFormValues) {
  return (await apiRequest<ReglaResponse>('/api/alimentacion/reglas', {
    method: 'POST',
    token,
    body: JSON.stringify(buildReglaPayload(values)),
  })).regla;
}

export async function updateReglaAlimentacion(token: string, id: number, values: ReglaAlimentacionFormValues) {
  return (await apiRequest<ReglaResponse>(`/api/alimentacion/reglas/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(buildReglaPayload(values)),
  })).regla;
}

export async function getStockAlimentacion(token: string, filters: Record<string, string | boolean> = {}) {
  return (await apiRequest<StockResponse>(`/api/alimentacion/stock${queryString(filters)}`, { token })).stock;
}

export async function crearMovimientoStock(
  token: string,
  alimentoId: number,
  values: { tipoMovimiento: 'ENTRADA' | 'BAJA'; cantidad: number; fecha: string; observaciones: string | null },
) {
  return (await apiRequest<MovimientoResponse>(`/api/alimentacion/stock/${alimentoId}/movimiento`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(values),
  })).movimiento;
}

export async function getMovimientosStock(
  token: string,
  filters: Record<string, string | number | boolean | undefined> = {},
) {
  return (await apiRequest<MovimientosResponse>(`/api/alimentacion/movimientos-stock${queryString(filters)}`, { token })).movimientos;
}

export async function getSugerenciaAlimentacion(token: string, loteId: number, fecha: string) {
  return (await apiRequest<SugerenciaResponse>(
    `/api/alimentacion/sugerencia${queryString({ loteId, fecha })}`,
    { token },
  )).sugerencia;
}

export async function registrarAlimentacion(token: string, payload: RegistrarAlimentacionPayload) {
  return (await apiRequest<RegistroResponse>('/api/alimentacion/registrar', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })).registro;
}

export async function getHistorialAlimentacion(
  token: string,
  filters: Record<string, string | number | boolean | undefined> = {},
) {
  return (await apiRequest<RegistrosResponse>(`/api/alimentacion/historial${queryString(filters)}`, { token })).registros;
}
