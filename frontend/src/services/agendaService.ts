import { apiRequest } from './apiClient';
import type { AgendaTarea, CancelAgendaTaskValues, EstadoTareaCalculado } from '../types/agenda';

interface AgendaResponse {
  agenda: AgendaTarea[];
}

interface AgendaTaskResponse {
  tarea: AgendaTarea;
}

export async function getAgendaPendiente(token: string) {
  const response = await apiRequest<AgendaResponse>('/agenda/pendientes', { token });
  return response.agenda;
}

export async function getAgenda(token: string, filters: { estado?: EstadoTareaCalculado | '' } = {}) {
  const params = new URLSearchParams();
  if (filters.estado) params.set('estado', filters.estado);
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
