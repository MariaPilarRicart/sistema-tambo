import { apiRequest } from './apiClient';
import type { AgendaTarea, CancelAgendaTaskValues } from '../types/agenda';

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
