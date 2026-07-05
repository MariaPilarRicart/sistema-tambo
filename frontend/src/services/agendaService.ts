import { apiRequest } from './apiClient';
import type { AgendaTarea, CancelAgendaTaskValues, EstadoTareaCalculado, TipoTarea } from '../types/agenda';

interface AgendaResponse {
  agenda: AgendaTarea[];
}

interface AgendaTaskResponse {
  tarea: AgendaTarea;
}

export async function getAgendaAbierta(token: string) {
  const response = await apiRequest<AgendaResponse>('/agenda/abiertas', { token });
  return response.agenda;
}

export async function getAgenda(
  token: string,
  filters: {
    estado?: EstadoTareaCalculado | '';
    tipo?: TipoTarea | '';
    fechaDesde?: string;
    fechaHasta?: string;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde);
  if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta);
  const query = params.toString();
  const response = await apiRequest<AgendaResponse>(`/agenda${query ? `?${query}` : ''}`, { token });
  return response.agenda;
}

export async function getAgendaTask(token: string, id: number) {
  const response = await apiRequest<AgendaTaskResponse>(`/agenda/${id}`, { token });
  return response.tarea;
}

export async function cancelAgendaTask(token: string, id: number, values: CancelAgendaTaskValues) {
  const response = await apiRequest<AgendaTaskResponse>(`/agenda/${id}/cancelar`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ observacion: values.observacion.trim() || null }),
  });

  return response.tarea;
}
