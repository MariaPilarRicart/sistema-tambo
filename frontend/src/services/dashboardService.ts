import { apiRequest } from './apiClient';
import type { DashboardPeriodo, DashboardResumen } from '../types/dashboard';

interface DashboardResumenResponse {
  resumen: DashboardResumen;
}

export async function getDashboardResumen(token: string, periodo: DashboardPeriodo = 'hoy') {
  const query = new URLSearchParams({ periodo });
  const response = await apiRequest<DashboardResumenResponse>(`/dashboard/resumen?${query.toString()}`, { token });

  return response.resumen;
}
