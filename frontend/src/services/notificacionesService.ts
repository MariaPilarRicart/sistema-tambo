import { apiRequest } from './apiClient';

export type NotificationPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

export interface SimpleNotification {
  id: string;
  clave: string;
  firma: string;
  titulo: string;
  descripcion: string;
  prioridad: NotificationPriority;
  ruta: string;
}

interface NotificationsResponse {
  total: number;
  notificaciones: SimpleNotification[];
}

export async function getSimpleNotifications(token: string) {
  return apiRequest<NotificationsResponse>('/api/notificaciones', { token });
}

export async function attendSimpleNotification(token: string, notification: Pick<SimpleNotification, 'clave' | 'firma'>) {
  return apiRequest<{ ok: boolean }>('/api/notificaciones/atender', {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      clave: notification.clave,
      firma: notification.firma,
    }),
  });
}
