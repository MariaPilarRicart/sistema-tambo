export type StatusTone = 'danger' | 'warning' | 'success' | 'neutral';

const dangerValues = new Set(['AGOTADO', 'VENCIDO', 'VENCIDA']);
const warningValues = new Set(['BAJO', 'PENDIENTE']);
const successValues = new Set(['NORMAL', 'PROGRAMADO', 'PROGRAMADA', 'ACTIVO', 'ACTIVA', 'DISPONIBLE', 'REALIZADA']);
const neutralValues = new Set(['INACTIVO', 'INACTIVA', 'VENDIDO', 'VENDIDA', 'CANCELADA']);

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${formatDate(date)} ${new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}`;
}

export function statusTone(value: string | null | undefined): StatusTone {
  const normalized = (value ?? '').toUpperCase();
  if (dangerValues.has(normalized)) return 'danger';
  if (warningValues.has(normalized)) return 'warning';
  if (successValues.has(normalized)) return 'success';
  if (neutralValues.has(normalized)) return 'neutral';
  return 'neutral';
}

export function statusClass(value: string | null | undefined) {
  const tone = statusTone(value);
  if (tone === 'danger') return 'status-danger';
  if (tone === 'warning') return 'status-warning';
  if (tone === 'success') return 'status-active';
  return 'status-inactive';
}

export function statusPriority(value: string | null | undefined) {
  const tone = statusTone(value);
  if (tone === 'danger') return 0;
  if (tone === 'warning') return 1;
  if (tone === 'success') return 2;
  return 3;
}

export function compareByStatusThenName<T>(
  left: T,
  right: T,
  getStatus: (item: T) => string | null | undefined,
  getName: (item: T) => string | null | undefined,
) {
  const statusDiff = statusPriority(getStatus(left)) - statusPriority(getStatus(right));
  if (statusDiff !== 0) return statusDiff;
  return (getName(left) ?? '').localeCompare(getName(right) ?? '', 'es-AR');
}

export function compareByDateStatusName<T>(
  left: T,
  right: T,
  getDate: (item: T) => string | Date | null | undefined,
  getStatus: (item: T) => string | null | undefined,
  getName: (item: T) => string | null | undefined,
) {
  const leftTime = getDate(left) ? new Date(getDate(left) as string | Date).getTime() : 0;
  const rightTime = getDate(right) ? new Date(getDate(right) as string | Date).getTime() : 0;
  if (leftTime !== rightTime) return rightTime - leftTime;
  return compareByStatusThenName(left, right, getStatus, getName);
}
