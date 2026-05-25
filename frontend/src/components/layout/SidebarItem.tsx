import { NavLink } from 'react-router-dom';
import type { NavigationItem } from '../../types/navigation';

interface SidebarItemProps {
  item: NavigationItem;
}

export function SidebarItem({ item }: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
    >
      <Icon size={20} />
      <span>{item.label}</span>
    </NavLink>
  );
}
