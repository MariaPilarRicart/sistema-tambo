import { apiRequest } from './apiClient';
import type { DashboardEmpleadoResumen, DashboardPeriodo, DashboardResumen } from '../types/dashboard';

interface DashboardResumenResponse {
  resumen: DashboardResumen;
}

interface DashboardEmpleadoResponse {
  resumen: DashboardEmpleadoResumen;
}

function buildDashboardQuery(periodo: DashboardPeriodo, customRange?: { fechaDesde: string; fechaHasta: string }) {
  const query = new URLSearchParams({ periodo });
  if (periodo === 'personalizado' && customRange) {
    query.set('fechaDesde', customRange.fechaDesde);
    query.set('fechaHasta', customRange.fechaHasta);
  }
  return query;
}

export async function getDashboardResumen(
  token: string,
  periodo: DashboardPeriodo = 'hoy',
  customRange?: { fechaDesde: string; fechaHasta: string },
) {
  const query = buildDashboardQuery(periodo, customRange);
  const response = await apiRequest<DashboardResumenResponse>(`/dashboard/resumen?${query.toString()}`, { token });

  return response.resumen;
}

export async function getDashboardAdmin(
  token: string,
  periodo: DashboardPeriodo = 'hoy',
  customRange?: { fechaDesde: string; fechaHasta: string },
) {
  const query = buildDashboardQuery(periodo, customRange);
  const response = await apiRequest<DashboardResumenResponse>(`/api/dashboard/admin?${query.toString()}`, { token });

  return response.resumen;
}

export async function getDashboardEmpleado(
  token: string,
  periodo: DashboardPeriodo = 'hoy',
  customRange?: { fechaDesde: string; fechaHasta: string },
) {
  const query = buildDashboardQuery(periodo, customRange);
  const response = await apiRequest<DashboardEmpleadoResponse>(`/dashboard/empleado?${query.toString()}`, { token });

  return response.resumen;
}
