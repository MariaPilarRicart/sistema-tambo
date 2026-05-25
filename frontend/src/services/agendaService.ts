import { apiRequest } from './apiClient';
import type { AgendaTarea, ListadosOperativos } from '../types/agenda';

interface AgendaResponse {
  agenda: AgendaTarea[];
}

interface ListadosOperativosResponse {
  listados: ListadosOperativos;
}

export async function getAgendaPendiente(token: string) {
  const response = await apiRequest<AgendaResponse>('/agenda/pendientes', { token });
  return response.agenda;
}

export async function getListadosOperativos(token: string) {
  const response = await apiRequest<ListadosOperativosResponse>('/agenda/listados-operativos', { token });
  return response.listados;
}
