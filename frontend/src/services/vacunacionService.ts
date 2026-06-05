import { apiRequest } from './apiClient';
import type { AgendaTarea } from '../types/agenda';
import type { Evento } from '../types/eventos';

interface VaccinationTasksResponse {
  tareas: AgendaTarea[];
}

interface VaccinationEventsResponse {
  eventos: Evento[];
}

interface ScheduleVaccinationResponse {
  tareasCreadas: number;
}

export interface ScheduleVaccinationValues {
  fechaProgramada: string;
  descripcion: string;
  animalIds: number[];
  loteId: string;
  categoria: string;
}

export async function getPendingVaccinationTasks(token: string) {
  const response = await apiRequest<VaccinationTasksResponse>('/vacunacion/tareas-pendientes', { token });
  return response.tareas;
}

export async function getVaccinationEvents(token: string) {
  const response = await apiRequest<VaccinationEventsResponse>('/vacunacion/eventos', { token });
  return response.eventos;
}

export async function scheduleVaccination(token: string, values: ScheduleVaccinationValues) {
  const response = await apiRequest<ScheduleVaccinationResponse>('/vacunacion/programar', {
    method: 'POST',
    token,
    body: JSON.stringify({
      fechaProgramada: values.fechaProgramada,
      descripcion: values.descripcion.trim() || null,
      animalIds: values.animalIds,
      loteId: values.loteId ? Number(values.loteId) : undefined,
      categoriaAnimal: values.categoria || undefined,
    }),
  });

  return response;
}
