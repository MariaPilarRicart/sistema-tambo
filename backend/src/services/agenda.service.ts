import { EstadoTarea, TipoTarea } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  cancelAgendaTask,
  findAgenda,
  findAgendaTaskById,
  findPendingAgenda,
} from '../repositories/agenda.repository';
import { calculateEstadoTarea, matchesEstadoCalculado, withEstadoCalculado, type EstadoTareaCalculado, type TareaConFechas } from './tareas-state.service';

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} invalido.`, 400);
  }

  return parsed;
}

function parseEstadoTarea(value: unknown): EstadoTareaCalculado {
  if (value === 'VENCIDA' || value === 'PROGRAMADA') return value;
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

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function taskMatchesDateRange(task: TareaConFechas, fechaDesde?: Date, fechaHasta?: Date) {
  if (!fechaDesde && !fechaHasta) return true;

  const from = fechaDesde ? startOfDay(fechaDesde) : undefined;
  const to = fechaHasta ? endOfDay(fechaHasta) : undefined;
  const estadoCalculado = calculateEstadoTarea(task);
  const fechaProgramada = startOfDay(task.fechaProgramada);
  const fechaObjetivo = startOfDay(task.fechaObjetivo ?? task.fechaProgramada);
  const fechaRealizacion = task.fechaRealizacion ? startOfDay(task.fechaRealizacion) : null;

  if (estadoCalculado === 'PENDIENTE') {
    if (from && fechaObjetivo < from) return false;
    if (to && fechaProgramada > to) return false;
    return true;
  }

  const referenceDate = estadoCalculado === 'REALIZADA' && fechaRealizacion ? fechaRealizacion : fechaObjetivo;
  if (from && referenceDate < from) return false;
  if (to && referenceDate > to) return false;
  return true;
}

export function listAgenda(query: Record<string, unknown>) {
  const estado = query.estado ? parseEstadoTarea(query.estado) : undefined;
  const fechaDesde = parseOptionalDate(query.fechaDesde, 'fechaDesde');
  const fechaHasta = parseOptionalDate(query.fechaHasta, 'fechaHasta');
  const tareas = findAgenda({
    estado: estado === 'VENCIDA' || estado === 'PROGRAMADA' ? undefined : estado,
    tipo: query.tipo ? parseTipoTarea(query.tipo) : undefined,
    animalId: query.animalId ? parseId(query.animalId, 'animalId') : undefined,
  });
  return tareas.then((items) => items
    .map((item) => withEstadoCalculado(item))
    .filter((item) => matchesEstadoCalculado(item, estado))
    .filter((item) => taskMatchesDateRange(item, fechaDesde, fechaHasta)));
}

export function listPendingAgenda() {
  return findPendingAgenda().then((items) => items.map((item) => withEstadoCalculado(item)));
}

export async function getAgendaTask(idParam: string) {
  const id = parseId(idParam, 'Id de tarea');
  const task = await findAgendaTaskById(id);

  if (!task) {
    throw new AppError('Tarea de agenda no encontrada.', 404);
  }

  return withEstadoCalculado(task);
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} invalida.`, 400);
  return value.trim() || null;
}

export async function cancelExistingAgendaTask(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de tarea');
  const task = await findAgendaTaskById(id);

  if (!task) {
    throw new AppError('Tarea de agenda no encontrada.', 404);
  }

  if (withEstadoCalculado(task).estadoCalculado !== EstadoTarea.PENDIENTE) {
    throw new AppError('Solo se pueden cancelar tareas pendientes.', 400);
  }

  return cancelAgendaTask(id, normalizeOptionalString(input.observacion, 'Observacion de cancelacion'));
}

