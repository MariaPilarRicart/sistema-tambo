import { CalendarCheck, History, LayoutDashboard, Milk, ReceiptText, Settings, Syringe, Wheat } from 'lucide-react';
import { paths } from '../../routes/paths';
import type { AuthUser } from '../../types/auth';
import type { NavigationItem } from '../../types/navigation';
import { CowIcon } from '../ui/CowIcon';
import { SidebarItem } from './SidebarItem';

const primaryNavigation: NavigationItem[] = [
  { label: 'Tablero', path: paths.dashboard, icon: LayoutDashboard },
  { label: 'Rodeo', path: paths.herd, icon: CowIcon },
  { label: 'Eventos', path: paths.events, icon: History },
  { label: 'Agenda', path: paths.agenda, icon: CalendarCheck },
  { label: 'Ventas', path: paths.sales, icon: ReceiptText },
  { label: 'Alimentacion', path: paths.feed, icon: Wheat },
  { label: 'Produccion', path: paths.production, icon: Milk },
  { label: 'Vacunacion', path: paths.vaccination, icon: Syringe },
];

const settingsNavigation: NavigationItem[] = [
  { label: 'Configuracion', path: paths.settings, icon: Settings },
];

interface SidebarProps {
  user: AuthUser;
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const canAccessSettings = user.role === 'ADMIN';

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

      <nav className="sidebar-nav" aria-label="Navegacion principal">
        {primaryNavigation.map((item) => (
          <SidebarItem key={item.path} item={item} />
        ))}

        {canAccessSettings && <div className="sidebar-section-title">Ajustes</div>}

        {canAccessSettings &&
          settingsNavigation.map((item) => (
            <SidebarItem key={item.path} item={item} />
          ))}
      </nav>

      <button type="button" className="logout-button" onClick={onLogout}>
        Cerrar sesion
      </button>
    </aside>
  );
}
