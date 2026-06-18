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
  const datosJson = values.tipo === 'TACTO'
    ? { resultado: values.resultadoTacto }
    : values.tipo === 'PARTO'
      ? {
          parto: {
            cantidadCrias: values.cantidadCrias,
            guacheraLoteId: values.guacheraLoteId ? Number(values.guacheraLoteId) : null,
            crias: values.crias.map((cria) => ({
              categoria: cria.categoria,
              estadoNacimiento: cria.estadoNacimiento,
              caravana: cria.caravana.trim() || null,
              observacion: cria.observacion.trim() || null,
            })),
          },
        }
      : values.tipo === 'CAMBIO_LOTE'
        ? {
            cambioLote: {
              loteDestinoId: Number(values.cambioLoteDestinoId),
              motivo: values.observaciones.trim() || null,
            },
          }
        : undefined;

  const response = await apiRequest<EventoResponse>('/eventos', {
    method: 'POST',
    token,
    body: JSON.stringify({
      animalId,
      tipo: values.tipo,
      fecha: buildEventDate(values.fecha),
      observaciones: values.observaciones.trim() || null,
      ...(datosJson ? { datosJson } : {}),
    }),
  });

  return response.evento;
}
