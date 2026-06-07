import { Link } from 'react-router-dom';
import {
  CalendarClock,
  ClipboardList,
  Clock3,
  HeartPulse,
  ListChecks,
  LucideIcon,
  Syringe,
  Utensils,
} from 'lucide-react';
import { paths } from '../../routes/paths';
import type { DashboardResumen } from '../../types/dashboard';

interface EmployeeDashboardProps {
  resumen: DashboardResumen;
}

function EmployeeMetricCard({
  description,
  icon: Icon,
  title,
  value,
  tone,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
  value: number;
  tone: 'emerald' | 'blue' | 'indigo' | 'pink' | 'amber' | 'rose';
}) {
  return (
    <article className={`metric-card dashboard-kpi-card dashboard-kpi-${tone}`}>
      <div className="dashboard-kpi-top">
        <div className={`metric-icon metric-icon-${tone}`}>
          <Icon size={20} />
        </div>
        <h3>{value}</h3>
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
    </article>
  );
}

export function EmployeeDashboard({ resumen }: EmployeeDashboardProps) {
  const priorityMessage =
    resumen.tareasVencidas > 0
      ? 'Primero revisar tareas vencidas'
      : resumen.tareasHoy > 0
        ? 'Completar tareas programadas para hoy'
        : 'No hay tareas urgentes para hoy';

  const metrics = [
    { title: 'Tareas vencidas', description: 'Revisar primero', value: resumen.tareasVencidas, icon: ListChecks, tone: 'rose' as const },
    { title: 'Tareas de hoy', description: 'Trabajo del dia', value: resumen.tareasHoy, icon: CalendarClock, tone: 'blue' as const },
    { title: 'Tareas futuras', description: 'Proximamente', value: resumen.tareasFuturas, icon: Clock3, tone: 'indigo' as const },
    { title: 'Tactos pendientes', description: 'Control reproductivo', value: resumen.tactosPendientes, icon: ClipboardList, tone: 'pink' as const },
    { title: 'Secados pendientes', description: 'Preparar actividad', value: resumen.secadosPendientes, icon: ClipboardList, tone: 'amber' as const },
    { title: 'Partos pendientes', description: 'Seguimiento diario', value: resumen.partosPendientes, icon: HeartPulse, tone: 'emerald' as const },
  ];

  const quickLinks = [
    { label: 'Agenda', to: paths.agenda, icon: CalendarClock },
    { label: 'Listados', to: paths.listings, icon: ListChecks },
    { label: 'Eventos', to: paths.events, icon: ClipboardList },
    { label: 'Alimentacion', to: paths.feed, icon: Utensils },
    { label: 'Produccion', to: paths.production, icon: HeartPulse },
    { label: 'Vacunacion', to: paths.vaccination, icon: Syringe },
  ];

  return (
    <>
      <section className="panel employee-priority-panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Prioridad del dia</h2>
            <p>Orden operativo sugerido para la jornada.</p>
          </div>
        </div>
        <div className={resumen.tareasVencidas > 0 ? 'form-error' : resumen.tareasHoy > 0 ? 'form-warning' : 'form-success'}>
          {priorityMessage}
        </div>
      </section>

      <div className="dashboard-kpi-grid employee-kpi-grid">
        {metrics.map((metric) => (
          <EmployeeMetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Accesos rapidos</h2>
            <p>Herramientas operativas de uso frecuente.</p>
          </div>
        </div>
        <div className="employee-quick-grid">
          {quickLinks.map(({ icon: Icon, label, to }) => (
            <Link className="employee-quick-card" to={to} key={label}>
              <Icon size={22} />
              <strong>{label}</strong>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
