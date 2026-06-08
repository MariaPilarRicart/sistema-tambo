import { Outlet, useLocation } from 'react-router-dom';
import { paths } from '../../routes/paths';
import type { AuthUser } from '../../types/auth';
import { AssistantChat } from '../assistant/AssistantChat';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const pageTitles: Record<string, string> = {
  [paths.dashboard]: 'Resumen General',
  [paths.herd]: 'Gestión del Rodeo',
  [paths.events]: 'Historial de Eventos',
  [paths.agenda]: 'Agenda Pendiente',
  [paths.feed]: 'Alimentación',
  [paths.vaccination]: 'Control de Vacunación',
  [paths.settings]: 'Usuarios',
  [paths.users]: 'Usuarios',
  [paths.profile]: 'Mi perfil',
};

interface MainLayoutProps {
  user: AuthUser;
  authToken: string | null;
  onLogout: () => void;
}

export function MainLayout({ user, authToken, onLogout }: MainLayoutProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'AgriDairy Pro';

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Header title={title} user={user} authToken={authToken} onUnauthorized={onLogout} />
        <section className="page-content">
          <Outlet />
        </section>
      </main>
      <AssistantChat user={user} authToken={authToken} onUnauthorized={onLogout} />
    </div>
  );
}
