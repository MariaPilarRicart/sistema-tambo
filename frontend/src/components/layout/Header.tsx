import { Bell } from 'lucide-react';
import type { AuthUser } from '../../types/auth';

interface HeaderProps {
  title: string;
  user: AuthUser;
}

export function Header({ title, user }: HeaderProps) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar-actions">
        <button type="button" className="notification-button" aria-label="Ver alertas">
          <Bell size={20} />
          <span />
        </button>
        <div className="user-summary">
          <div className="avatar">{initials}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role === 'ADMIN' ? 'Administrador' : 'Empleado'}</small>
          </div>
        </div>
      </div>
    </header>
  );
}
