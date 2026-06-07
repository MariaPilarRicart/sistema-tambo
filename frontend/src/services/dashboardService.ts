import { apiRequest } from './apiClient';
import type { DashboardPeriodo, DashboardResumen } from '../types/dashboard';

interface DashboardResumenResponse {
  resumen: DashboardResumen;
}

export async function getDashboardResumen(
  token: string,
  periodo: DashboardPeriodo = 'hoy',
  customRange?: { fechaDesde: string; fechaHasta: string },
) {
  const query = new URLSearchParams({ periodo });
  if (periodo === 'personalizado' && customRange) {
    query.set('fechaDesde', customRange.fechaDesde);
    query.set('fechaHasta', customRange.fechaHasta);
  }
  const response = await apiRequest<DashboardResumenResponse>(`/dashboard/resumen?${query.toString()}`, { token });

  return response.resumen;
}
