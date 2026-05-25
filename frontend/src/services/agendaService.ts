import { apiRequest } from './apiClient';
import type { AgendaTarea } from '../types/agenda';

interface AgendaResponse {
  agenda: AgendaTarea[];
}

export async function getAgendaPendiente(token: string) {
  const response = await apiRequest<AgendaResponse>('/agenda/pendientes', { token });
  return response.agenda;
}
