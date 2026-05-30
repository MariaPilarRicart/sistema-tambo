import { apiRequest } from './apiClient';
import type {
  ProduccionAnimal,
  ProduccionFilters,
  ProduccionFormValues,
  ProduccionPorAnimal,
  ProduccionPorLote,
  ProduccionResumen,
} from '../types/produccion';

interface ProduccionesResponse {
  registros: ProduccionAnimal[];
}

interface ProduccionResponse {
  produccion: ProduccionAnimal;
}

interface ResumenResponse {
  resumen: ProduccionResumen;
}

interface ProduccionPorAnimalResponse {
  produccion: ProduccionPorAnimal;
}

interface ProduccionPorLoteResponse {
  produccion: ProduccionPorLote;
}

function optionalNumber(value: string) {
  return value === '' ? null : Number(value);
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
  const litrosDescartados = Number(values.litrosDescartados || 0);

  return {
    animalId: Number(values.animalId),
    fechaHora: values.fechaHora,
    turno: values.turno,
    litrosProducidos: Number(values.litrosProducidos || 0),
    litrosDescartados,
    motivoDescarte: litrosDescartados > 0 ? values.motivoDescarte : null,
    observacionDescarte: values.observacionDescarte.trim() || null,
    temperaturaTanque: optionalNumber(values.temperaturaTanque),
    grasa: optionalNumber(values.grasa),
    proteina: optionalNumber(values.proteina),
    recuentoCelulasSomaticas: optionalNumber(values.recuentoCelulasSomaticas),
    recuentoBacteriano: optionalNumber(values.recuentoBacteriano),
    observacionesCalidad: values.observacionesCalidad.trim() || null,
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

export async function getProduccionPorAnimal(token: string, animalId: number) {
  const response = await apiRequest<ProduccionPorAnimalResponse>(`/api/produccion/por-animal/${animalId}`, { token });
  return response.produccion;
}

export async function getProduccionPorLote(token: string, loteId: number) {
  const response = await apiRequest<ProduccionPorLoteResponse>(`/api/produccion/por-lote/${loteId}`, { token });
  return response.produccion;
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
