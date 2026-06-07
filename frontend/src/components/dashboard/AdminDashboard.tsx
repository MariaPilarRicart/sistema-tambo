import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  HeartPulse,
  LucideIcon,
  XCircle,
} from 'lucide-react';
import { paths } from '../../routes/paths';
import type { DashboardGroup, DashboardResumen } from '../../types/dashboard';

interface AdminDashboardProps {
  resumen: DashboardResumen;
}

const chartColors = ['#059669', '#2563eb', '#4f46e5', '#d97706', '#db2777', '#64748b'];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function DashboardMetricCard({
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

function compactLoteGroups(groups: DashboardGroup[]) {
  const nonEmptyGroups = groups.filter((group) => group.total > 0).sort((a, b) => b.total - a.total);
  const topGroups = nonEmptyGroups.slice(0, 5);
  const restTotal = nonEmptyGroups.slice(5).reduce((sum, group) => sum + group.total, 0);

  return restTotal > 0 ? [...topGroups, { nombre: 'Otros', total: restTotal }] : topGroups;
}

function HorizontalBarChart({ groups }: { groups: DashboardGroup[] }) {
  const maxValue = Math.max(...groups.map((group) => group.total), 1);
  const total = groups.reduce((sum, group) => sum + group.total, 0);

  if (groups.length === 0) {
    return <p className="table-empty">Sin datos para mostrar.</p>;
  }

  return (
    <div className="compact-bars">
      {groups.map((group, index) => {
        const percentage = total > 0 ? Math.round((group.total / total) * 100) : 0;

        return (
          <div className="compact-bar-row" key={group.id ?? group.nombre}>
            <div className="compact-bar-label">
              <strong>{group.nombre}</strong>
              <span>{group.total} · {percentage}%</span>
            </div>
            <div className="compact-bar-track" aria-hidden="true">
              <span
                style={{
                  background: chartColors[index % chartColors.length],
                  width: `${(group.total / maxValue) * 100}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ groups }: { groups: DashboardGroup[] }) {
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (groups.length === 0 || total === 0) {
    return <p className="table-empty">Sin datos para mostrar.</p>;
  }

  return (
    <div className="donut-chart-wrap">
      <div className="donut-chart">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="donut-bg" cx="50" cy="50" r={radius} />
          {groups.map((group, index) => {
            const dash = (group.total / total) * circumference;
            const currentOffset = offset;
            offset += dash;

            return (
              <circle
                key={group.nombre}
                className="donut-segment"
                cx="50"
                cy="50"
                r={radius}
                stroke={chartColors[index % chartColors.length]}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
              />
            );
          })}
        </svg>
        <div>
          <strong>{total}</strong>
          <span>total</span>
        </div>
      </div>
      <div className="chart-legend">
        {groups.map((group, index) => {
          const percentage = total > 0 ? Math.round((group.total / total) * 100) : 0;

          return (
            <div className="chart-legend-row" key={group.nombre}>
              <span style={{ background: chartColors[index % chartColors.length] }} />
              <strong>{group.nombre}</strong>
              <small>{group.total} · {percentage}%</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="panel dashboard-chart-card">
      <div className="dashboard-card-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function AdminDashboard({ resumen }: AdminDashboardProps) {
  const metrics = [
    { title: 'Animales activos', description: 'En rodeo operativo', value: resumen.animalesActivos, icon: CheckCircle2, tone: 'emerald' as const },
    { title: 'Animales inactivos', description: 'Bajas historicas', value: resumen.animalesInactivos, icon: XCircle, tone: 'rose' as const },
    { title: 'Tareas vencidas', description: 'Requieren atencion', value: resumen.tareasVencidas, icon: AlertTriangle, tone: 'amber' as const },
    { title: 'Tareas de hoy', description: 'Plan del dia', value: resumen.tareasHoy, icon: CalendarClock, tone: 'blue' as const },
    { title: 'Tareas futuras', description: 'Agenda programada', value: resumen.tareasFuturas, icon: Clock3, tone: 'indigo' as const },
    { title: 'Tactos pendientes', description: 'Control reproductivo', value: resumen.tactosPendientes, icon: ClipboardList, tone: 'pink' as const },
    { title: 'Secados pendientes', description: 'Proximos secados', value: resumen.secadosPendientes, icon: ClipboardList, tone: 'amber' as const },
    { title: 'Partos pendientes', description: 'Seguimiento prenatal', value: resumen.partosPendientes, icon: HeartPulse, tone: 'emerald' as const },
  ];

  const alerts = [
    ...(resumen.tareasVencidas > 0
      ? [{ title: 'Tareas vencidas', detail: `Hay ${resumen.tareasVencidas} tareas pendientes fuera de fecha.`, className: 'alert-critical' }]
      : []),
    ...(resumen.tareasHoy > 0
      ? [{ title: 'Tareas de hoy', detail: `Hay ${resumen.tareasHoy} tareas programadas para completar hoy.`, className: 'alert-info' }]
      : []),
    ...(resumen.partosPendientes > 0
      ? [{ title: 'Seguimiento de partos', detail: `${resumen.partosPendientes} partos pendientes requieren seguimiento.`, className: 'alert-warning' }]
      : []),
    ...(resumen.secadosPendientes > 0
      ? [{ title: 'Planificacion de secados', detail: `${resumen.secadosPendientes} secados pendientes para organizar.`, className: 'alert-warning' }]
      : []),
    ...(resumen.tactosPendientes > 0
      ? [{ title: 'Control reproductivo', detail: `${resumen.tactosPendientes} tactos pendientes para revisar.`, className: 'alert-info' }]
      : []),
  ];

  const agendaItems = [
    { label: 'Vencidas', value: resumen.tareasVencidas, tone: 'rose' },
    { label: 'Hoy', value: resumen.tareasHoy, tone: 'blue' },
    { label: 'Futuras', value: resumen.tareasFuturas, tone: 'indigo' },
    { label: 'Tactos', value: resumen.tactosPendientes, tone: 'pink' },
    { label: 'Secados', value: resumen.secadosPendientes, tone: 'amber' },
    { label: 'Partos', value: resumen.partosPendientes, tone: 'emerald' },
  ];

  return (
    <>
      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Alertas para la toma de decisiones</h2>
            <p>Prioridades simples basadas en agenda y reproduccion.</p>
          </div>
        </div>
        {alerts.length === 0 ? (
          <p className="table-empty">Sin alertas relevantes por el momento.</p>
        ) : (
          <div className="dashboard-alert-grid">
            {alerts.map((alert) => (
              <article className={`alert-card ${alert.className}`} key={alert.title}>
                <AlertTriangle size={18} />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="dashboard-kpi-grid">
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="dashboard-distribution-grid">
        <ChartCard title="Animales por lote" description="Top 5 lotes con mas animales">
          <HorizontalBarChart groups={compactLoteGroups(resumen.animalesPorLote)} />
        </ChartCard>
        <ChartCard title="Estado reproductivo" description="Distribucion porcentual">
          <DonutChart groups={resumen.animalesPorEstadoReproductivo.filter((group) => group.total > 0)} />
        </ChartCard>
        <ChartCard title="Categorias" description="Composicion del rodeo">
          <DonutChart groups={resumen.animalesPorCategoria.filter((group) => group.total > 0)} />
        </ChartCard>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="panel dashboard-agenda-panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Agenda operativa</h2>
              <p>Resumen de tareas pendientes</p>
            </div>
            <Link className="panel-chip" to={paths.listings}>Ver listados</Link>
          </div>
          <div className="agenda-mini-grid">
            {agendaItems.map((item) => (
              <div className={`agenda-mini-item agenda-mini-${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel dashboard-events-panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Ultimos eventos registrados</h2>
              <p>Actividad reciente del rodeo.</p>
            </div>
            <Link className="panel-chip" to={paths.events}>Ver eventos</Link>
          </div>

          {resumen.ultimosEventos.length === 0 ? (
            <p className="table-empty">Sin eventos registrados.</p>
          ) : (
            <div className="table-wrap">
              <table className="users-table dashboard-events-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Animal</th>
                    <th>Lote</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.ultimosEventos.slice(0, 5).map((evento) => (
                    <tr key={evento.id}>
                      <td>{formatDateTime(evento.fecha)}</td>
                      <td><span className="status-pill status-active">{evento.tipo}</span></td>
                      <td>
                        {evento.animal ? (
                          <Link className="table-link" to={`/rodeos/${evento.animal.id}`}>
                            #{evento.animal.caravana}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{evento.animal?.lote?.nombre ?? '-'}</td>
                      <td>{evento.observaciones || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
