import { Outlet, useLocation } from 'react-router-dom';
import { paths } from '../../routes/paths';
import type { AuthUser } from '../../types/auth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const pageTitles: Record<string, string> = {
  [paths.dashboard]: 'Resumen General',
  [paths.herd]: 'Gestion del Rodeo',
  [paths.events]: 'Historial de Eventos',
  [paths.agenda]: 'Agenda Pendiente',
  [paths.listings]: 'Listados Operativos',
  [paths.feed]: 'Alimentacion',
  [paths.vaccination]: 'Control de Vacunacion',
  [paths.settings]: 'Configuracion del Sistema',
};

interface MainLayoutProps {
  user: AuthUser;
  onLogout: () => void;
}

export function MainLayout({ user, onLogout }: MainLayoutProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'AgriDairy Pro';

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Header title={title} user={user} />
        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
