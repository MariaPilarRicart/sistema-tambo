import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { DashboardPeriodoInput, getDashboardResumen } from '../services/dashboard.service';

function parsePeriodo(value: unknown): DashboardPeriodoInput {
  if (value === 'semana' || value === 'mes' || value === 'anio' || value === 'hoy') return value;
  if (value === 'personalizado' || value === 'PERSONALIZADO') return 'personalizado';
  if (value === 'SEMANA') return 'semana';
  if (value === 'MES') return 'mes';
  if (value === 'ANIO' || value === 'AÑO') return 'anio';
  if (value === 'HOY') return 'hoy';
  return 'hoy';
}

function parseDateOnly(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value) {
    throw new AppError('Seleccioná fecha desde y fecha hasta', 400);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new AppError(`${fieldName} inválida`, 400);

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) throw new AppError(`${fieldName} inválida`, 400);

  return date;
}

export async function getDashboardResumenController(request: Request, response: Response) {
  const periodo = parsePeriodo(request.query.periodo);
  const customRange =
    periodo === 'personalizado'
      ? {
          fechaDesde: parseDateOnly(request.query.fechaDesde, 'Fecha desde'),
          fechaHasta: parseDateOnly(request.query.fechaHasta, 'Fecha hasta'),
        }
      : {};

  if (customRange.fechaDesde && customRange.fechaHasta && customRange.fechaDesde > customRange.fechaHasta) {
    throw new AppError('La fecha desde no puede ser mayor a la fecha hasta', 400);
  }

  const resumen = await getDashboardResumen(periodo, customRange);

  response.status(200).json({ resumen });
}
