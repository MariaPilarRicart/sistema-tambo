import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  DollarSign,
  Droplets,
  LucideIcon,
  PackageCheck,
  ShieldAlert,
  Truck,
  Utensils,
} from 'lucide-react';
import { paths } from '../../routes/paths';
import type { DashboardGroup, DashboardPeriodo, DashboardResumen } from '../../types/dashboard';

interface AdminDashboardProps {
  periodo: DashboardPeriodo;
  resumen: DashboardResumen;
  onPeriodoChange: (periodo: DashboardPeriodo) => void;
}

const chartColors = ['#059669', '#2563eb', '#4f46e5', '#d97706', '#db2777', '#64748b'];
const periodOptions: Array<{ value: DashboardPeriodo; label: string }> = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatNumber(value: number, suffix = '') {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', { currency: 'ARS', style: 'currency', maximumFractionDigits: 0 }).format(value);
}

function formatNullable(value: number | null, suffix = '') {
  return value === null ? 'Sin datos' : formatNumber(value, suffix);
}

function severityClass(severity: string) {
  if (severity === 'CRITICA' || severity === 'CRITICO') return 'alert-critical';
  if (severity === 'MEDIA' || severity === 'BAJO') return 'alert-warning';
  return 'alert-info';
}

function badgeClass(value: string) {
  if (value === 'CRITICO') return 'badge-critical';
  if (value === 'BAJO') return 'badge-warning';
  return 'badge-success';
}

function KpiCard({
  description,
  icon: Icon,
  title,
  value,
  tone,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
  value: string;
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

function SectionCard({ children, description, title }: { children: ReactNode; description: string; title: string }) {
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

function SimpleBars({
  emptyMessage,
  series,
}: {
  emptyMessage: string;
  series: Array<{ etiqueta: string; litrosProducidos: number; litrosNetos: number; litrosDescartados: number }>;
}) {
  const maxValue = Math.max(...series.map((item) => item.litrosProducidos), 1);

  if (series.length === 0) return <p className="table-empty">{emptyMessage}</p>;

  return (
    <div className="compact-bars">
      {series.map((item) => (
        <div className="compact-bar-row" key={item.etiqueta}>
          <div className="compact-bar-label">
            <strong>{item.etiqueta}</strong>
            <span>{formatNumber(item.litrosProducidos, ' L')}</span>
          </div>
          <div className="compact-bar-track" aria-hidden="true">
            <span style={{ width: `${(item.litrosProducidos / maxValue) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
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

export function AdminDashboard({ periodo, resumen, onPeriodoChange }: AdminDashboardProps) {
  const { resumenProduccion, resumenVentas, resumenLeche, resumenAlimentacion, resumenSanidad } = resumen;
  const kpis = [
    { title: 'Litros producidos', description: 'Periodo seleccionado', value: formatNumber(resumenProduccion.litrosProducidos, ' L'), icon: Droplets, tone: 'blue' as const },
    { title: 'Litros netos', description: 'Produccion menos descarte', value: formatNumber(resumenProduccion.litrosNetos, ' L'), icon: PackageCheck, tone: 'emerald' as const },
    { title: 'Descarte', description: `${formatNumber(resumenProduccion.litrosDescartados, ' L')} descartados`, value: formatNumber(resumenProduccion.porcentajeDescarte, '%'), icon: AlertTriangle, tone: 'amber' as const },
    { title: 'Leche disponible', description: `${resumenLeche.lotesDisponibles} lotes disponibles`, value: formatNumber(resumenLeche.litrosDisponibles, ' L'), icon: Truck, tone: 'indigo' as const },
    { title: 'Litros vendidos', description: `${resumenVentas.cantidadVentas} ventas`, value: formatNumber(resumenVentas.litrosVendidos, ' L'), icon: BarChart3, tone: 'pink' as const },
    { title: 'Facturacion', description: `Promedio ${formatNullable(resumenVentas.precioPromedioLitro, ' $/L')}`, value: formatCurrency(resumenVentas.facturacion), icon: DollarSign, tone: 'emerald' as const },
    { title: 'Stock critico', description: 'Insumos bajo minimo', value: String(resumenAlimentacion.insumosBajoMinimo), icon: Utensils, tone: 'rose' as const },
    { title: 'Tareas vencidas', description: 'Agenda pendiente', value: String(resumen.tareasVencidas), icon: ClipboardList, tone: 'amber' as const },
  ];

  return (
    <>
      <section className="dashboard-period-toolbar">
        <div>
          <h2>Tablero gerencial</h2>
          <p>Periodo: {formatDate(resumen.fechaDesde)} al {formatDate(resumen.fechaHasta)}</p>
        </div>
        <div className="dashboard-period-selector" aria-label="Seleccionar periodo">
          {periodOptions.map((option) => (
            <button
              className={periodo === option.value ? 'dashboard-period-active' : ''}
              key={option.value}
              onClick={() => onPeriodoChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <div className="dashboard-kpi-grid">
        {kpis.map((metric) => (
          <KpiCard key={metric.title} {...metric} />
        ))}
      </div>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Alertas de gestión</h2>
            <p>Máximo de alertas accionables para resolver hoy.</p>
          </div>
        </div>
        {resumen.alertasGestion.length === 0 ? (
          <p className="table-empty">Sin alertas de gestión para este período.</p>
        ) : (
          <div className="dashboard-alert-grid">
            {resumen.alertasGestion.map((alerta) => (
              <article className={`alert-card ${severityClass(alerta.severidad)}`} key={alerta.titulo}>
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
        <SectionCard title="Producción" description="Producción, descarte y evolución del período.">
          <div className="dashboard-detail-grid">
            <span>Registros <strong>{resumenProduccion.cantidadRegistros}</strong></span>
            <span>Animales <strong>{resumenProduccion.animalesConProduccion}</strong></span>
            <span>Promedio/vaca <strong>{formatNullable(resumenProduccion.promedioLitrosPorAnimal, ' L')}</strong></span>
            <span>Último lote <strong>{resumenProduccion.ultimoLote?.codigo ?? 'Sin datos'}</strong></span>
          </div>
          <SimpleBars emptyMessage="Sin datos registrados para este período." series={resumenProduccion.series} />
          <p className="dashboard-section-note">
            Mayor producción: {resumenProduccion.loteMayorProduccion
              ? `${resumenProduccion.loteMayorProduccion.codigo} · ${formatNumber(resumenProduccion.loteMayorProduccion.litrosProducidos, ' L')}`
              : 'Sin datos'}
          </p>
        </SectionCard>

        <SectionCard title="Ventas y leche disponible" description="Ventas del período y stock comercial desde lotes de leche.">
          <div className="dashboard-detail-grid">
            <span>Precio promedio <strong>{formatNullable(resumenVentas.precioPromedioLitro, ' $/L')}</strong></span>
            <span>Lotes disponibles <strong>{resumenLeche.lotesDisponibles}</strong></span>
            <span>Próximos a vencer <strong>{resumenLeche.lotesProximosAVencer}</strong></span>
            <span>Disponible <strong>{formatNumber(resumenLeche.litrosDisponibles, ' L')}</strong></span>
          </div>
          <h3 className="dashboard-subtitle">Últimas ventas</h3>
          {resumenVentas.ultimasVentas.length === 0 ? (
            <p className="table-empty">Sin ventas registradas para este período.</p>
          ) : (
            <div className="table-wrap">
              <table className="users-table dashboard-compact-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Factura</th>
                    <th>Cliente</th>
                    <th>Litros</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenVentas.ultimasVentas.map((venta) => (
                    <tr key={venta.id}>
                      <td>{formatDate(venta.fecha)}</td>
                      <td>{venta.factura}</td>
                      <td>{venta.cliente}</td>
                      <td>{formatNumber(venta.litros, ' L')}</td>
                      <td>{formatCurrency(venta.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="dashboard-two-column">
        <SectionCard title="Alimentación y stock" description="Lectura de insumos activos contra stock mínimo.">
          <div className="dashboard-detail-grid">
            <span>Insumos activos <strong>{resumenAlimentacion.insumosActivos}</strong></span>
            <span>Bajo mínimo <strong>{resumenAlimentacion.insumosBajoMinimo}</strong></span>
          </div>
          {resumenAlimentacion.insumos.length === 0 ? (
            <p className="table-empty">Sin insumos cargados.</p>
          ) : (
            <div className="table-wrap">
              <table className="users-table dashboard-compact-table">
                <thead>
                  <tr>
                    <th>Alimento</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenAlimentacion.insumos.slice(0, 8).map((insumo) => (
                    <tr key={insumo.id}>
                      <td>{insumo.alimento}</td>
                      <td>{formatNumber(insumo.stockActual)} {insumo.unidad}</td>
                      <td>{formatNumber(insumo.stockMinimo)} {insumo.unidad}</td>
                      <td><span className={`badge ${badgeClass(insumo.estado)}`}>{insumo.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Sanidad" description="Controles sanitarios vencidos o próximos.">
          <div className="dashboard-detail-grid">
            <span>Vencidas <strong>{resumenSanidad.tareasSanitariasVencidas}</strong></span>
            <span>Próximas <strong>{resumenSanidad.tareasSanitariasProximas}</strong></span>
            <span>Pendientes <strong>{resumenSanidad.controlesPendientes}</strong></span>
          </div>
          {resumenSanidad.tareas.length === 0 ? (
            <p className="table-empty">Sin controles sanitarios pendientes o próximos.</p>
          ) : (
            <div className="table-wrap">
              <table className="users-table dashboard-compact-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Fecha objetivo</th>
                    <th>Alcance</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenSanidad.tareas.map((tarea) => (
                    <tr key={tarea.id}>
                      <td>{tarea.tipo}</td>
                      <td>{formatDate(tarea.fechaObjetivo)}</td>
                      <td>{tarea.lote ?? tarea.categoria ?? tarea.alcance}</td>
                      <td><span className="badge badge-warning">{tarea.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Lotes de leche disponibles" description="Stock comercial calculado desde LoteLeche y VentaDetalle.">
        {resumenLeche.lotes.length === 0 ? (
          <p className="table-empty">Sin lotes disponibles para vender.</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producción</th>
                  <th>Vencimiento</th>
                  <th>Netos</th>
                  <th>Vendidos</th>
                  <th>Disponibles</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {resumenLeche.lotes.map((lote) => (
                  <tr key={lote.id}>
                    <td><strong>{lote.codigo}</strong></td>
                    <td>{formatDate(lote.fechaProduccion)}</td>
                    <td>{formatDate(lote.fechaVencimiento)}</td>
                    <td>{formatNumber(lote.litrosNetos, ' L')}</td>
                    <td>{formatNumber(lote.litrosVendidos, ' L')}</td>
                    <td>{formatNumber(lote.litrosDisponibles, ' L')}</td>
                    <td><span className="badge badge-success">{lote.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Composición del rodeo</h2>
            <p>Indicadores secundarios de estructura del rodeo.</p>
          </div>
          <Link className="panel-chip" to={paths.herd}>Ver rodeo</Link>
        </div>
        <div className="dashboard-detail-grid dashboard-herd-summary">
          <span>Activos <strong>{resumen.animalesActivos}</strong></span>
          <span>Inactivos <strong>{resumen.animalesInactivos}</strong></span>
          <span>Tactos pendientes <strong>{resumen.tactosPendientes}</strong></span>
          <span>Partos pendientes <strong>{resumen.partosPendientes}</strong></span>
        </div>
        <div className="dashboard-distribution-grid">
          <SectionCard title="Animales por lote" description="Top 5 lotes con más animales">
            <HorizontalBarChart groups={compactLoteGroups(resumen.animalesPorLote)} />
          </SectionCard>
          <SectionCard title="Estado reproductivo" description="Distribución por estado">
            <HorizontalBarChart groups={resumen.animalesPorEstadoReproductivo.filter((group) => group.total > 0)} />
          </SectionCard>
          <SectionCard title="Categorías" description="Composición por categoría">
            <HorizontalBarChart groups={resumen.animalesPorCategoria.filter((group) => group.total > 0)} />
          </SectionCard>
        </div>
      </section>
    </>
  );
}
