import { apiRequest } from './apiClient';
import type { Evento, EventoFilters, EventoFormValues } from '../types/eventos';

interface EventosResponse {
  eventos: Evento[];
}

interface EventoResponse {
  evento: Evento;
}

function buildQuery(filters: EventoFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildEventDate(fecha: string) {
  return fecha ? `${fecha}T12:00:00` : undefined;
}

export async function getEventos(token: string, filters: EventoFilters) {
  const response = await apiRequest<EventosResponse>(`/eventos${buildQuery(filters)}`, { token });
  return response.eventos;
}

export async function createEvento(token: string, animalId: number, values: EventoFormValues) {
  const response = await apiRequest<EventoResponse>('/eventos', {
    method: 'POST',
    token,
    body: JSON.stringify({
      animalId,
      tipo: values.tipo,
      fecha: buildEventDate(values.fecha),
      observaciones: values.observaciones.trim() || null,
      ...(values.tipo === 'TACTO'
        ? { datosJson: { resultado: values.resultadoTacto } }
        : {}),
    }),
  });

  return response.evento;
}
