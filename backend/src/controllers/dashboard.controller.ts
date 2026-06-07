import type { Request, Response } from 'express';
import { DashboardPeriodo, getDashboardResumen } from '../services/dashboard.service';

function parsePeriodo(value: unknown): DashboardPeriodo {
  if (value === 'semana' || value === 'mes' || value === 'anio' || value === 'hoy') return value;
  if (value === 'SEMANA') return 'semana';
  if (value === 'MES') return 'mes';
  if (value === 'ANIO' || value === 'AÑO') return 'anio';
  if (value === 'HOY') return 'hoy';
  return 'hoy';
}

export async function getDashboardResumenController(request: Request, response: Response) {
  const resumen = await getDashboardResumen(parsePeriodo(request.query.periodo));

  response.status(200).json({ resumen });
}
