import { apiRequest } from './apiClient';
import type { DashboardResumen } from '../types/dashboard';

interface DashboardResumenResponse {
  resumen: DashboardResumen;
}

export async function getDashboardResumen(token: string) {
  const response = await apiRequest<DashboardResumenResponse>('/dashboard/resumen', { token });

  return response.resumen;
}
