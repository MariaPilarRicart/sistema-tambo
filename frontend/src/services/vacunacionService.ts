import { apiRequest } from './apiClient';
import type { AgendaTarea, TipoSanitario } from '../types/agenda';
import type { CategoriaAnimal } from '../types/animales';
import type { UserRole } from '../types/auth';
import type { Lote } from '../types/lotes';

export type EstadoSanitario = 'PROGRAMADA' | 'PENDIENTE' | 'REALIZADA' | 'VENCIDA';
export type AlcanceSanitario = 'ANIMAL' | 'LOTE' | 'CATEGORIA';

export interface VaccinationHistoryItem {
  id: string;
  tareaIds: number[];
  fechaProgramada: string;
  fechaObjetivo: string;
  fechaRealizada: string | null;
  tipoSanitario: TipoSanitario;
  estado: EstadoSanitario;
  alcance: {
    tipo: AlcanceSanitario;
    lote: Pick<Lote, 'id' | 'nombre'> | null;
    categoriaAnimal: CategoriaAnimal | null;
  };
  cantidadAnimales: number;
  animal: AgendaTarea['animal'];
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  } | null;
  observaciones: string | null;
  tareas: AgendaTarea[];
}

export interface VaccinationSummary {
  pendientes: number;
  vencidas: number;
  realizadas: number;
  programadas: number;
  todas: number;
}

export interface VaccinationFilters {
  estado: EstadoSanitario | '';
  tipo: TipoSanitario | '';
  fechaProgramadaDesde: string;
  fechaProgramadaHasta: string;
  fechaObjetivoDesde: string;
  fechaObjetivoHasta: string;
  fechaRealizadaDesde: string;
  fechaRealizadaHasta: string;
  loteId: string;
  categoria: CategoriaAnimal | '';
}

interface VaccinationTasksResponse {
  tareas: AgendaTarea[];
}

interface VaccinationTaskResponse {
  tarea: AgendaTarea;
}

interface VaccinationHistoryResponse {
  registros: VaccinationHistoryItem[];
  resumen: VaccinationSummary;
}

interface VaccinationSummaryResponse {
  resumen: VaccinationSummary;
}

interface ScheduleVaccinationResponse {
  tareasCreadas: number;
}

export interface ScheduleVaccinationValues {
  fechaProgramada: string;
  fechaObjetivo: string;
  tipoSanitario: TipoSanitario | '';
  descripcion: string;
  animalIds: number[];
  loteId: string;
  categoria: string;
}

export interface PerformVaccinationValues {
  fechaRealizada: string;
  observaciones: string;
}

export interface PerformVaccinationsBulkValues extends PerformVaccinationValues {
  vacunacionIds: number[];
}

interface PerformVaccinationsBulkResponse {
  tareasActualizadas: number;
  proximasTareasCreadas: number;
}

function buildQuery(filters: Partial<VaccinationFilters>) {
  const params = new URLSearchParams();
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.fechaProgramadaDesde) params.set('fechaProgramadaDesde', filters.fechaProgramadaDesde);
  if (filters.fechaProgramadaHasta) params.set('fechaProgramadaHasta', filters.fechaProgramadaHasta);
  if (filters.fechaObjetivoDesde) params.set('fechaObjetivoDesde', filters.fechaObjetivoDesde);
  if (filters.fechaObjetivoHasta) params.set('fechaObjetivoHasta', filters.fechaObjetivoHasta);
  if (filters.fechaRealizadaDesde) params.set('fechaRealizadaDesde', filters.fechaRealizadaDesde);
  if (filters.fechaRealizadaHasta) params.set('fechaRealizadaHasta', filters.fechaRealizadaHasta);
  if (filters.loteId) params.set('loteId', filters.loteId);
  if (filters.categoria) params.set('categoria', filters.categoria);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getPendingVaccinationTasks(token: string) {
  const response = await apiRequest<VaccinationTasksResponse>('/vacunacion/tareas-pendientes', { token });
  return response.tareas;
}

export async function getVaccinationHistory(token: string, filters: Partial<VaccinationFilters> = {}) {
  return apiRequest<VaccinationHistoryResponse>(`/api/vacunacion${buildQuery(filters)}`, { token });
}

export async function getVaccinationSummary(token: string) {
  const response = await apiRequest<VaccinationSummaryResponse>('/api/vacunacion/resumen', { token });
  return response.resumen;
}

export async function scheduleVaccination(token: string, values: ScheduleVaccinationValues) {
  const response = await apiRequest<ScheduleVaccinationResponse>('/api/vacunacion/programar', {
    method: 'POST',
    token,
    body: JSON.stringify({
      fechaProgramada: values.fechaProgramada,
      fechaObjetivo: values.fechaObjetivo || values.fechaProgramada,
      tipoSanitario: values.tipoSanitario,
      descripcion: values.descripcion.trim() || null,
      animalIds: values.animalIds,
      loteId: values.loteId ? Number(values.loteId) : undefined,
      categoriaAnimal: values.categoria || undefined,
    }),
  });

  return response;
}

export async function performVaccination(token: string, taskId: number, values: PerformVaccinationValues) {
  return apiRequest<VaccinationTaskResponse>(`/api/vacunacion/${taskId}/realizar`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      fechaRealizada: values.fechaRealizada,
      observaciones: values.observaciones.trim() || null,
    }),
  });
}

export async function performVaccinationsBulk(token: string, values: PerformVaccinationsBulkValues) {
  return apiRequest<PerformVaccinationsBulkResponse>('/api/vacunacion/realizar-masivo', {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      vacunacionIds: values.vacunacionIds,
      fechaRealizada: values.fechaRealizada,
      observaciones: values.observaciones.trim() || null,
    }),
  });
}
