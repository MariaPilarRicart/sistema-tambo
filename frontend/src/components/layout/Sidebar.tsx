import { CalendarCheck, History, LayoutDashboard, Milk, ReceiptText, Syringe, Users, Wheat } from 'lucide-react';
import { paths } from '../../routes/paths';
import type { AuthUser } from '../../types/auth';
import type { NavigationItem } from '../../types/navigation';
import { CowIcon } from '../ui/CowIcon';
import { SidebarItem } from './SidebarItem';

const primaryNavigation: NavigationItem[] = [
  { label: 'Tablero', path: paths.dashboard, icon: LayoutDashboard },
  { label: 'Eventos', path: paths.events, icon: History },
  { label: 'Agenda', path: paths.agenda, icon: CalendarCheck },
  { label: 'Rodeo', path: paths.herd, icon: CowIcon },
  { label: 'Producción', path: paths.production, icon: Milk },
  { label: 'Alimentación', path: paths.feed, icon: Wheat },
  { label: 'Vacunación', path: paths.vaccination, icon: Syringe },
  { label: 'Ventas', path: paths.sales, icon: ReceiptText },
];

const settingsNavigation: NavigationItem[] = [
  { label: 'Usuarios', path: paths.users, icon: Users },
];

interface SidebarProps {
  user: AuthUser;
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const canAccessSettings = user.role === 'ADMIN';
  const visibleNavigation = primaryNavigation.filter((item) => user.role === 'ADMIN' || item.path !== paths.sales);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <CowIcon size={24} />
        </div>
        <span className="brand-name">
          AgriDairy<span>Pro</span>
        </span>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {visibleNavigation.map((item) => (
          <SidebarItem key={item.path} item={item} />
        ))}

        {canAccessSettings &&
          settingsNavigation.map((item) => (
            <SidebarItem key={item.path} item={item} />
          ))}
      </nav>

      <button type="button" className="logout-button" onClick={onLogout}>
        Cerrar sesión
      </button>
    </aside>
  );
}
