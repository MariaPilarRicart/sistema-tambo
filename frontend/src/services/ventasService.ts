import { apiRequest } from './apiClient';
import type {
  EntregaFilters,
  EntregaFormValues,
  EntregaLeche,
  LiquidacionFilters,
  LiquidacionFormValues,
  LiquidacionLeche,
  SugerenciaLiquidacion,
  VentasResumen,
} from '../types/ventas';
import type { Ordene } from '../types/produccion';

interface ResumenResponse {
  resumen: VentasResumen;
}

interface EntregasResponse {
  entregas: EntregaLeche[];
}

interface EntregaResponse {
  entrega: EntregaLeche;
}

interface OrdenesDisponiblesResponse {
  ordenes: Ordene[];
}

interface LiquidacionesResponse {
  liquidaciones: LiquidacionLeche[];
}

interface LiquidacionResponse {
  liquidacion: LiquidacionLeche;
}

interface SugerenciaResponse {
  sugerencia: SugerenciaLiquidacion;
}

function buildQuery(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildEntregaPayload(values: EntregaFormValues) {
  return {
    clienteId: Number(values.clienteId),
    fechaRetiro: values.fechaRetiro,
    ordeneIds: values.ordeneIds.map(Number),
    observacion: values.observacion.trim() || null,
  };
}

function buildLiquidacionPayload(values: LiquidacionFormValues) {
  return {
    clienteId: Number(values.clienteId),
    mes: Number(values.mes),
    anio: Number(values.anio),
    numero: values.numero.trim(),
    fechaLiquidacion: values.fechaLiquidacion,
    precioLitro: Number(values.precioLitro || 0),
    litrosLiquidados: Number(values.litrosLiquidados || 0),
    observacion: values.observacion.trim() || null,
  };
}

export async function getResumenVentas(token: string) {
  const response = await apiRequest<ResumenResponse>('/api/ventas/resumen', { token });
  return response.resumen;
}

export async function getEntregasLeche(token: string, filters: Partial<EntregaFilters> = {}) {
  const response = await apiRequest<EntregasResponse>(`/api/ventas/entregas${buildQuery(filters)}`, { token });
  return response.entregas;
}

export async function getOrdenesDisponiblesVenta(token: string) {
  const response = await apiRequest<OrdenesDisponiblesResponse>('/api/ventas/ordenes-disponibles', { token });
  return response.ordenes;
}

export async function createEntregaLeche(token: string, values: EntregaFormValues) {
  const response = await apiRequest<EntregaResponse>('/api/ventas/entregas', {
    method: 'POST',
    token,
    body: JSON.stringify(buildEntregaPayload(values)),
  });
  return response.entrega;
}

export async function updateEntregaLeche(token: string, id: number, values: EntregaFormValues) {
  const response = await apiRequest<EntregaResponse>(`/api/ventas/entregas/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(buildEntregaPayload(values)),
  });
  return response.entrega;
}

export async function deleteEntregaLeche(token: string, id: number) {
  const response = await apiRequest<EntregaResponse>(`/api/ventas/entregas/${id}`, {
    method: 'DELETE',
    token,
  });
  return response.entrega;
}

export async function getLiquidacionesLeche(token: string, filters: Partial<LiquidacionFilters> = {}) {
  const response = await apiRequest<LiquidacionesResponse>(`/api/ventas/liquidaciones${buildQuery(filters)}`, { token });
  return response.liquidaciones;
}

export async function getSugerenciaLiquidacion(token: string, clienteId: string, mes: string, anio: string) {
  const response = await apiRequest<SugerenciaResponse>(
    `/api/ventas/liquidaciones/sugerencia${buildQuery({ clienteId, mes, anio })}`,
    { token },
  );
  return response.sugerencia;
}

export async function createLiquidacionLeche(token: string, values: LiquidacionFormValues) {
  const response = await apiRequest<LiquidacionResponse>('/api/ventas/liquidaciones', {
    method: 'POST',
    token,
    body: JSON.stringify(buildLiquidacionPayload(values)),
  });
  return response.liquidacion;
}
