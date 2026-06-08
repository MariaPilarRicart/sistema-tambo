import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paths } from '../../routes/paths';
import { ApiError, DATA_CHANGED_EVENT } from '../../services/apiClient';
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

function formatNotificationDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  });
}

function NotificationButton({
  notification,
  onClick,
}: {
  notification: SimpleNotification;
  onClick: (notification: SimpleNotification) => void;
}) {
  const formattedDate = formatNotificationDate(notification.fecha);

  return (
    <button type="button" className="notification-item" onClick={() => onClick(notification)}>
      <span className={`notification-priority-dot ${priorityClass(notification.prioridad)}`} />
      <span>
        <strong>{notification.titulo}</strong>
        <small>{notification.descripcion}</small>
        <em>{notification.modulo}{formattedDate ? ` · ${formattedDate}` : ''}</em>
      </span>
    </button>
  );
}

export function Header({ title, user, authToken, onUnauthorized }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [areNotificationsExpanded, setAreNotificationsExpanded] = useState(false);
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
    setAreNotificationsExpanded(false);
    navigate(notification.ruta);
  }

  useEffect(() => {
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, user.role]);

  useEffect(() => {
    setIsNotificationsOpen(false);
    setAreNotificationsExpanded(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
        setAreNotificationsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  useEffect(() => {
    function handleDataChanged() {
      void loadNotifications();
    }

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const visibleLimit = areNotificationsExpanded ? notifications.length : 3;
  const dropdownNotifications = notifications.slice(0, visibleLimit);
  const displayedNotificationsCount = Math.min(notificationTotal, areNotificationsExpanded ? notificationTotal : 3);
  const hasMoreNotifications = notificationTotal > 3;
  const notificationBadge = notificationTotal > 3 ? '+3' : String(notificationTotal);

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
            {notificationTotal > 0 && <span className="notification-count">{notificationBadge}</span>}
          </button>
          {isNotificationsOpen && (
            <div className={`notifications-menu ${areNotificationsExpanded ? 'notifications-menu-expanded' : ''}`}>
              <div className="notifications-menu-header">
                <strong>Notificaciones</strong>
                <small>Mostrando {displayedNotificationsCount} de {notificationTotal}</small>
              </div>
              {isLoadingNotifications && <p className="notifications-empty">Cargando...</p>}
              {!isLoadingNotifications && notificationsError && <p className="notifications-empty">{notificationsError}</p>}
              {!isLoadingNotifications && !notificationsError && notifications.length === 0 && (
                <p className="notifications-empty">No tenés notificaciones pendientes.</p>
              )}
              {!isLoadingNotifications && !notificationsError && dropdownNotifications.map((notification) => (
                <NotificationButton key={notification.id} notification={notification} onClick={handleNotificationClick} />
              ))}
              {!isLoadingNotifications && !notificationsError && hasMoreNotifications && (
                <button
                  type="button"
                  className="notifications-more-button"
                  onClick={() => setAreNotificationsExpanded((expanded) => !expanded)}
                >
                  {areNotificationsExpanded ? 'VER MENOS' : 'VER MÁS'}
                </button>
              )}
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
