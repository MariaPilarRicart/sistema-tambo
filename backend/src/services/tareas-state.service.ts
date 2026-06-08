import { EstadoTarea } from '@prisma/client';

export type EstadoTareaCalculado = EstadoTarea | 'VENCIDA' | 'PROGRAMADA';

export interface TareaConFechas {
  estado: EstadoTarea;
  fechaProgramada: Date;
  fechaObjetivo?: Date | null;
  fechaRealizacion?: Date | null;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getFechaReferenciaTarea(task: Pick<TareaConFechas, 'fechaProgramada' | 'fechaObjetivo'>) {
  return task.fechaObjetivo ?? task.fechaProgramada;
}

export function calculateEstadoTarea(task: TareaConFechas, today = new Date()): EstadoTareaCalculado {
  if (task.fechaRealizacion || task.estado === EstadoTarea.REALIZADA) return EstadoTarea.REALIZADA;
  if (task.estado === EstadoTarea.CANCELADA) return EstadoTarea.CANCELADA;

  const fechaProgramada = startOfDay(task.fechaProgramada);
  const fechaObjetivo = startOfDay(getFechaReferenciaTarea(task));
  const todayStart = startOfDay(today);

  if (todayStart < fechaProgramada) return 'PROGRAMADA';
  if (todayStart > fechaObjetivo) return 'VENCIDA';
  return 'PENDIENTE';
}

export function withEstadoCalculado<T extends TareaConFechas>(task: T, today = new Date()) {
  return {
    ...task,
    estadoCalculado: calculateEstadoTarea(task, today),
  };
}

export function matchesEstadoCalculado(task: TareaConFechas, estado?: EstadoTareaCalculado, today = new Date()) {
  if (!estado) return true;
  return calculateEstadoTarea(task, today) === estado;
}
