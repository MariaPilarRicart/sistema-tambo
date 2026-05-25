import { EstadoTarea, TipoTarea } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { findAgenda, findOperativePendingAgenda, findPendingAgenda } from '../repositories/agenda.repository';

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} invalido.`, 400);
  }

  return parsed;
}

function parseEstadoTarea(value: unknown) {
  if (Object.values(EstadoTarea).includes(value as EstadoTarea)) {
    return value as EstadoTarea;
  }

  throw new AppError('Estado de tarea invalido.', 400);
}

function parseTipoTarea(value: unknown) {
  if (Object.values(TipoTarea).includes(value as TipoTarea)) {
    return value as TipoTarea;
  }

  throw new AppError('Tipo de tarea invalido.', 400);
}

function parseOptionalDate(value: unknown, fieldName: string) {
  if (!value) return undefined;
  if (typeof value !== 'string') throw new AppError(`${fieldName} invalida.`, 400);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${fieldName} invalida.`, 400);

  return date;
}

export function listAgenda(query: Record<string, unknown>) {
  return findAgenda({
    estado: query.estado ? parseEstadoTarea(query.estado) : undefined,
    tipo: query.tipo ? parseTipoTarea(query.tipo) : undefined,
    animalId: query.animalId ? parseId(query.animalId, 'animalId') : undefined,
    fechaDesde: parseOptionalDate(query.fechaDesde, 'fechaDesde'),
    fechaHasta: parseOptionalDate(query.fechaHasta, 'fechaHasta'),
  });
}

export function listPendingAgenda() {
  return findPendingAgenda();
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function getListadosOperativos() {
  const tareas = await findOperativePendingAgenda();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  return {
    vencidas: tareas.filter((tarea) => tarea.fechaProgramada < todayStart),
    hoy: tareas.filter((tarea) => tarea.fechaProgramada >= todayStart && tarea.fechaProgramada <= todayEnd),
    proximas: tareas.filter((tarea) => tarea.fechaProgramada > todayEnd),
    tactos: tareas.filter((tarea) => tarea.tipo === TipoTarea.TACTO),
    secados: tareas.filter((tarea) => tarea.tipo === TipoTarea.SECADO),
    partos: tareas.filter((tarea) => tarea.tipo === TipoTarea.PARTO),
    altasPostParto: tareas.filter((tarea) => tarea.tipo === TipoTarea.ALTA_POST_PARTO),
  };
}
