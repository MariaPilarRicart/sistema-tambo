import { apiRequest } from './apiClient';
import type {
  Ordene,
  ProduccionFilters,
  ProduccionFormValues,
  ProduccionResumen,
} from '../types/produccion';

interface ProduccionesResponse {
  registros: Ordene[];
}

interface ProduccionResponse {
  produccion: Ordene;
}

interface ResumenResponse {
  resumen: ProduccionResumen;
}

function buildQuery(filters: Partial<ProduccionFilters>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildProduccionPayload(values: ProduccionFormValues) {
  return {
    fecha: values.fecha,
    turno: values.turno,
    litrosBuenos: Number(values.litrosBuenos || 0),
    litrosDescartados: Number(values.litrosDescartados || 0),
    observaciones: values.observaciones.trim() || null,
    detalles: values.detalles
      .filter((detalle) => detalle.animalId && detalle.litros !== '')
      .map((detalle) => ({
        animalId: Number(detalle.animalId),
        litros: Number(detalle.litros || 0),
        observaciones: detalle.observaciones.trim() || null,
      })),
  };
}

export async function getProducciones(token: string, filters: Partial<ProduccionFilters> = {}) {
  const response = await apiRequest<ProduccionesResponse>(`/api/produccion${buildQuery(filters)}`, { token });
  return response.registros;
}

export async function getResumenProduccion(token: string) {
  const response = await apiRequest<ResumenResponse>('/api/produccion/resumen', { token });
  return response.resumen;
}

export async function createProduccion(token: string, values: ProduccionFormValues) {
  const response = await apiRequest<ProduccionResponse>('/api/produccion', {
    method: 'POST',
    token,
    body: JSON.stringify(buildProduccionPayload(values)),
  });
  return response.produccion;
}

export async function deleteProduccion(token: string, id: number) {
  const response = await apiRequest<ProduccionResponse>(`/api/produccion/${id}`, {
    method: 'DELETE',
    token,
  });
  return response.produccion;
}
