import { EstadoTarea } from '@prisma/client';

export type EstadoTareaCalculado = 'VENCIDA' | 'PROGRAMADA' | 'REALIZADA' | 'CANCELADA';

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
  const estado = String(task.estado);
  if (task.fechaRealizacion || estado === 'REALIZADA') return 'REALIZADA';
  if (estado === 'CANCELADA') return 'CANCELADA';

  const fechaObjetivo = startOfDay(getFechaReferenciaTarea(task));
  const todayStart = startOfDay(today);

  return fechaObjetivo <= todayStart ? 'VENCIDA' : 'PROGRAMADA';
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
