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
  fechaRealizada: string | null;
  tipoSanitario: TipoSanitario;
  estado: EstadoSanitario;
  alcance: {
    tipo: AlcanceSanitario;
    lote: Pick<Lote, 'id' | 'nombre'> | null;
    categoriaAnimal: CategoriaAnimal | null;
  };
  cantidadAnimales: number;
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
  fechaDesde: string;
  fechaHasta: string;
}

interface VaccinationTasksResponse {
  tareas: AgendaTarea[];
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
  tipoSanitario: TipoSanitario | '';
  descripcion: string;
  animalIds: number[];
  loteId: string;
  categoria: string;
}

function buildQuery(filters: Partial<VaccinationFilters>) {
  const params = new URLSearchParams();
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde);
  if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta);
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
      tipoSanitario: values.tipoSanitario,
      descripcion: values.descripcion.trim() || null,
      animalIds: values.animalIds,
      loteId: values.loteId ? Number(values.loteId) : undefined,
      categoriaAnimal: values.categoria || undefined,
    }),
  });

  return response;
}
