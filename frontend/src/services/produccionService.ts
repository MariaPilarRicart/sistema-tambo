import { apiRequest } from './apiClient';
import type {
  LoteLeche,
  LoteLecheCreateValues,
  LoteLecheEditValues,
  ProduccionAnimal,
  ProduccionFilters,
  ProduccionFormValues,
  ProduccionPorAnimal,
  ProduccionPorLote,
  ProduccionPorLoteLeche,
  ProduccionResumen,
} from '../types/produccion';

interface LotesLecheResponse {
  lotesLeche: LoteLeche[];
}

interface LoteLecheResponse {
  loteLeche: LoteLeche;
}

interface SiguienteCodigoResponse {
  codigo: string;
}

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

interface ProduccionPorLoteLecheResponse {
  produccion: ProduccionPorLoteLeche;
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

function buildLoteLecheCreatePayload(values: LoteLecheCreateValues) {
  return {
    codigo: values.codigo.trim(),
    descripcion: values.descripcion.trim() || null,
  };
}

function buildLoteLecheEditPayload(values: LoteLecheEditValues) {
  return {
    descripcion: values.descripcion.trim() || null,
    fechaVencimiento: values.fechaVencimiento,
    estado: values.estado,
    grasa: optionalNumber(values.grasa),
    proteina: optionalNumber(values.proteina),
    recuentoBacteriano: optionalNumber(values.recuentoBacteriano),
    recuentoCelulasSomaticas: optionalNumber(values.recuentoCelulasSomaticas),
    temperatura: optionalNumber(values.temperatura),
    observacionesCalidad: values.observacionesCalidad.trim() || null,
    litrosDescartados: Number(values.litrosDescartados || 0),
    motivoDescarte: Number(values.litrosDescartados || 0) > 0 ? values.motivoDescarte : null,
    observacionDescarte: values.observacionDescarte.trim() || null,
  };
}

function buildProduccionPayload(values: ProduccionFormValues) {
  const litrosDescartados = Number(values.litrosDescartados || 0);
  return {
    animalId: Number(values.animalId),
    loteLecheId: Number(values.loteLecheId),
    fechaHora: values.fechaHora,
    turno: values.turno,
    litrosProducidos: Number(values.litrosProducidos || 0),
    litrosDescartados,
    motivoDescarte: litrosDescartados > 0 ? values.motivoDescarte : null,
    observacionDescarte: values.observacionDescarte.trim() || null,
  };
}

export async function getLotesLeche(token: string) {
  const response = await apiRequest<LotesLecheResponse>('/api/lotes-leche', { token });
  return response.lotesLeche;
}

export async function getSiguienteCodigoLoteLeche(token: string) {
  const response = await apiRequest<SiguienteCodigoResponse>('/api/lotes-leche/siguiente-codigo', { token });
  return response.codigo;
}

export async function createLoteLeche(token: string, values: LoteLecheCreateValues) {
  const response = await apiRequest<LoteLecheResponse>('/api/lotes-leche', {
    method: 'POST',
    token,
    body: JSON.stringify(buildLoteLecheCreatePayload(values)),
  });
  return response.loteLeche;
}

export async function updateLoteLeche(token: string, id: number, values: LoteLecheEditValues) {
  const response = await apiRequest<LoteLecheResponse>(`/api/lotes-leche/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(buildLoteLecheEditPayload(values)),
  });
  return response.loteLeche;
}

export async function deleteLoteLeche(token: string, id: number) {
  const response = await apiRequest<LoteLecheResponse>(`/api/lotes-leche/${id}`, {
    method: 'DELETE',
    token,
  });
  return response.loteLeche;
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

export async function getProduccionPorLoteLeche(token: string, loteLecheId: number) {
  const response = await apiRequest<ProduccionPorLoteLecheResponse>(`/api/produccion/por-lote-leche/${loteLecheId}`, { token });
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
