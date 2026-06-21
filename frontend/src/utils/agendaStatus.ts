import type { AgendaTarea, EstadoTareaCalculado } from '../types/agenda';

export const openAgendaStatuses: EstadoTareaCalculado[] = ['PENDIENTE', 'PROGRAMADA', 'VENCIDA'];

export const agendaStatusLabels: Record<EstadoTareaCalculado, string> = {
  PENDIENTE: 'Pendiente',
  PROGRAMADA: 'Programada',
  REALIZADA: 'Realizada',
  VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada',
};

export const agendaStatusSortOrder: Record<EstadoTareaCalculado, number> = {
  VENCIDA: 0,
  PENDIENTE: 1,
  PROGRAMADA: 1,
  REALIZADA: 2,
  CANCELADA: 3,
};

export function agendaDateOnly(value: string) {
  return value.slice(0, 10);
}

function todayDateOnly() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAgendaTaskDate(task: AgendaTarea) {
  return task.fechaObjetivo ?? task.fechaProgramada;
}

export function getEstadoOperativoAgenda(task: AgendaTarea): EstadoTareaCalculado {
  if (task.estado === 'REALIZADA' || task.estado === 'CANCELADA') {
    return task.estado;
  }

  const taskDate = agendaDateOnly(getAgendaTaskDate(task));
  const today = todayDateOnly();

  if (taskDate > today) return 'PROGRAMADA';
  if (taskDate < today) return 'VENCIDA';
  return 'PENDIENTE';
}

export function isOpenAgendaStatus(status: EstadoTareaCalculado) {
  return openAgendaStatuses.includes(status);
}
