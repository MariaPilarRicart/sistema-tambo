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
  ShieldCheck,
  Utensils,
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

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value);
}

function severityClass(severity: string) {
  if (severity === 'CRITICA' || severity === 'VENCIDA' || severity === 'VENCIDO' || severity === 'CRITICO') {
    return 'badge-critical';
  }
  if (severity === 'MEDIA' || severity === 'PROXIMA' || severity === 'PROXIMO' || severity === 'ATENCION') {
    return 'badge-warning';
  }
  if (severity === 'OK') return 'badge-success';
  return 'badge-info';
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

  if (groups.length === 0) return <p className="table-empty">Sin datos para mostrar.</p>;

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

  if (groups.length === 0 || total === 0) return <p className="table-empty">Sin datos para mostrar.</p>;

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
    { title: 'Tactos pendientes', description: 'Control reproductivo', value: resumen.tactosPendientes, icon: ClipboardList, tone: 'pink' as const },
    { title: 'Secados pendientes', description: 'Proximos secados', value: resumen.secadosPendientes, icon: ClipboardList, tone: 'amber' as const },
    { title: 'Partos pendientes', description: 'Seguimiento prenatal', value: resumen.partosPendientes, icon: HeartPulse, tone: 'emerald' as const },
    { title: 'Alertas alimentacion', description: 'Stock y cobertura', value: resumen.alertasAlimentacion.length, icon: Utensils, tone: 'indigo' as const },
    { title: 'Alertas sanitarias', description: 'Vacunas y analisis', value: resumen.alertasSanitarias.length, icon: ShieldCheck, tone: 'rose' as const },
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
      <div className="dashboard-kpi-grid">
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Alertas prioritarias</h2>
            <p>Criticas, advertencias e informativas.</p>
          </div>
        </div>
        {resumen.alertasPrioritarias.length === 0 ? (
          <p className="table-empty">Sin alertas prioritarias.</p>
        ) : (
          <div className="dashboard-alert-grid">
            {resumen.alertasPrioritarias.map((alerta, index) => (
              <article className={`alert-card ${alerta.severidad === 'CRITICA' ? 'alert-critical' : alerta.severidad === 'MEDIA' ? 'alert-warning' : 'alert-info'}`} key={`${alerta.titulo}-${index}`}>
                <AlertTriangle size={18} />
                <div>
                  <strong>{alerta.titulo}</strong>
                  <p>{alerta.detalle}</p>
                  <small>{alerta.accionSugerida}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="dashboard-two-column">
        <section className="panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Cobertura de alimentos</h2>
              <p>Stock actual contra consumo diario estimado.</p>
            </div>
          </div>
          {resumen.coberturaAlimentos.length === 0 ? (
            <p className="table-empty">No hay stock cargado para calcular cobertura.</p>
          ) : (
            <div className="table-wrap">
              <table className="users-table dashboard-coverage-table">
                <thead>
                  <tr>
                    <th>Alimento</th>
                    <th>Stock</th>
                    <th>Consumo diario</th>
                    <th>Cobertura</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.coberturaAlimentos.map((item) => (
                    <tr key={item.alimento}>
                      <td><strong>{item.alimento}</strong></td>
                      <td>{formatNumber(item.stockActual)} {item.unidad}</td>
                      <td>{item.consumoDiarioEstimado > 0 ? `${formatNumber(item.consumoDiarioEstimado)} ${item.unidad}/dia` : '-'}</td>
                      <td>{item.diasCobertura === null ? '-' : `${formatNumber(item.diasCobertura)} dias`}</td>
                      <td><span className={`badge ${severityClass(item.estado)}`}>{item.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Vacunacion y sanidad</h2>
              <p>Controles sanitarios anuales.</p>
            </div>
          </div>
          {resumen.controlesSanitarios.length === 0 ? (
            <p className="table-empty">Sin registros sanitarios cargados.</p>
          ) : (
            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Control</th>
                    <th>Ultima</th>
                    <th>Proxima</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.controlesSanitarios.map((control) => (
                    <tr key={control.tipo}>
                      <td><strong>{control.nombre}</strong></td>
                      <td>{formatDate(control.ultimaAplicacion)}</td>
                      <td>{formatDate(control.proximaFechaEsperada)}</td>
                      <td><span className={`badge ${severityClass(control.estado)}`}>{control.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="panel dashboard-agenda-panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Agenda operativa</h2>
              <p>Reproductiva y sanitaria pendiente.</p>
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
    </>
  );
}
