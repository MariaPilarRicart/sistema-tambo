import { apiRequest } from './apiClient';
import type { Lote, LoteFormValues } from '../types/lotes';

interface LotesResponse {
  lotes: Lote[];
}

interface LoteResponse {
  lote: Lote;
}

function buildLotePayload(values: LoteFormValues) {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
    activo: values.activo,
  };
}

export async function getLotes(token: string) {
  const response = await apiRequest<LotesResponse>('/lotes', { token });

  return response.lotes;
}

export async function createLote(token: string, values: LoteFormValues) {
  const response = await apiRequest<LoteResponse>('/lotes', {
    method: 'POST',
    token,
    body: JSON.stringify(buildLotePayload(values)),
  });

  return response.lote;
}

export async function updateLote(token: string, id: number, values: LoteFormValues) {
  const response = await apiRequest<LoteResponse>(`/lotes/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(buildLotePayload(values)),
  });

  return response.lote;
}

export async function deactivateLote(token: string, id: number) {
  const response = await apiRequest<LoteResponse>(`/lotes/${id}`, {
    method: 'DELETE',
    token,
  });

  return response.lote;
}
