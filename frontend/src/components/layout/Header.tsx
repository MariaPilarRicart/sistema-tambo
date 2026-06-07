import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paths } from '../../routes/paths';
import { ApiError } from '../../services/apiClient';
import { attendSimpleNotification, getSimpleNotifications, type SimpleNotification } from '../../services/notificacionesService';
import type { AuthUser } from '../../types/auth';

interface HeaderProps {
  title: string;
  user: AuthUser;
  authToken: string | null;
  onUnauthorized: () => void;
}

function priorityClass(priority: SimpleNotification['prioridad']) {
  if (priority === 'CRITICA') return 'notification-priority-critical';
  if (priority === 'ALTA') return 'notification-priority-high';
  if (priority === 'MEDIA') return 'notification-priority-medium';
  return 'notification-priority-low';
}

export function Header({ title, user, authToken, onUnauthorized }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function loadNotifications() {
    if (!authToken) return;
    setIsLoadingNotifications(true);
    setNotificationsError('');
    try {
      const response = await getSimpleNotifications(authToken);
      setNotifications(response.notificaciones);
      setNotificationTotal(response.total);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setNotificationsError('No se pudieron cargar las notificaciones.');
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  async function handleNotificationClick(notification: SimpleNotification) {
    if (!authToken) return;
    try {
      await attendSimpleNotification(authToken, notification);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setNotificationsError('No se pudo atender la notificación.');
      return;
    }
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    setNotificationTotal((current) => Math.max(0, current - 1));
    setIsNotificationsOpen(false);
    navigate(notification.ruta);
  }

  useEffect(() => {
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, user.role]);

  useEffect(() => {
    setIsNotificationsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar-actions">
        <div className="notification-wrap" ref={notificationRef}>
          <button
            type="button"
            className="notification-button"
            aria-label="Ver notificaciones"
            onClick={() => {
              setIsNotificationsOpen((open) => !open);
              if (!isNotificationsOpen) void loadNotifications();
            }}
          >
            <Bell size={20} />
            {notificationTotal > 0 && <span className="notification-count">{notificationTotal > 9 ? '9+' : notificationTotal}</span>}
          </button>
          {isNotificationsOpen && (
            <div className="notifications-menu">
              <div className="notifications-menu-header">
                <strong>Notificaciones</strong>
                <small>{notificationTotal} activas</small>
              </div>
              {isLoadingNotifications && <p className="notifications-empty">Cargando...</p>}
              {!isLoadingNotifications && notificationsError && <p className="notifications-empty">{notificationsError}</p>}
              {!isLoadingNotifications && !notificationsError && notifications.length === 0 && (
                <p className="notifications-empty">No tenés notificaciones pendientes</p>
              )}
              {!isLoadingNotifications && !notificationsError && notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className="notification-item"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className={`notification-priority ${priorityClass(notification.prioridad)}`} />
                  <span>
                    <strong>{notification.titulo}</strong>
                    <small>{notification.descripcion}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="user-summary user-summary-button"
          onClick={() => navigate(paths.profile)}
          aria-label="Ir a Mi perfil"
        >
          <div className="avatar">{user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role === 'ADMIN' ? 'Administrador' : 'Empleado'}</small>
          </div>
        </button>
      </div>
    </header>
  );
}
