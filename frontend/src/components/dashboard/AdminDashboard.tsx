import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  DollarSign,
  Droplets,
  PackageCheck,
  ShoppingCart,
  TrendingDown,
  Truck,
  Users,
  UserPlus,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '../../routes/paths';
import type { DashboardGroup, DashboardPeriodo, DashboardResumen, MetricTone } from '../../types/dashboard';

interface AdminDashboardProps {
  periodo: DashboardPeriodo;
  fechaDesde: string;
  fechaHasta: string;
  periodoError: string;
  resumen: DashboardResumen;
  onPeriodoChange: (periodo: DashboardPeriodo) => void;
  onFechaDesdeChange: (value: string) => void;
  onFechaHastaChange: (value: string) => void;
  onApplyCustomPeriod: () => void;
  onClearCustomPeriod: () => void;
}

const periodOptions: Array<{ value: DashboardPeriodo; label: string }> = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
  { value: 'personalizado', label: 'Personalizado' },
];

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const donutColors = ['#10b981', '#2563eb', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

function toDateInput(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumber(value: number, suffix = '') {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', { currency: 'ARS', style: 'currency', maximumFractionDigits: 0 }).format(value);
}

function periodText(periodo: DashboardPeriodo, fechaDesde: string, fechaHasta: string) {
  const start = new Date(fechaDesde);
  if (periodo === 'hoy') return `Fecha: ${formatDate(fechaDesde)}`;
  if (periodo === 'semana') return `Semana: ${formatDate(fechaDesde)} al ${formatDate(fechaHasta)}`;
  if (periodo === 'mes') return `Mes: ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
  if (periodo === 'anio') return `Año: ${start.getFullYear()}`;
  return `Período: ${formatDate(fechaDesde)} al ${formatDate(fechaHasta)}`;
}

function buildUrl(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return `${path}?${query.toString()}`;
}

function friendlyEnum(value: string | null | undefined) {
  if (!value) return '-';
  const labels: Record<string, string> = {
    VACA_PRODUCCION: 'Vaca en producción',
    VACA_SECA: 'Vaca seca',
    PREPARTO: 'Preparto',
    NO_APLICA: 'No aplica',
    VACIA: 'Vacía',
    PRENADA: 'Preñada',
    INSEMINADA: 'Inseminada',
    RECUPERACION: 'Recuperación',
    GUACHERA: 'Guachera',
    ESCUELITA: 'Escuelita',
    TERNERA: 'Ternera',
    VAQUILLONA: 'Vaquillona',
    TORO: 'Toro',
    BAJA: 'Baja',
  };
  if (labels[value]) return labels[value];
  const readable = value.toLowerCase().replace(/_/g, ' ');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function DashboardKpiCard({
  icon: Icon,
  onClick,
  subtitle,
  title,
  tone,
  value,
}: {
  icon: LucideIcon;
  onClick: () => void;
  subtitle: string;
  title: string;
  tone: MetricTone;
  value: string;
}) {
  return (
    <button className={`metric-card dashboard-kpi-card dashboard-kpi-clickable dashboard-kpi-${tone}`} type="button" onClick={onClick}>
      <div className="dashboard-kpi-top">
        <div className={`metric-icon metric-icon-${tone}`}>
          <Icon size={22} />
        </div>
        <h3>{value}</h3>
      </div>
      <strong>{title}</strong>
      <p>{subtitle}</p>
    </button>
  );
}

function topGroupsWithOthers(groups: DashboardGroup[], limit = 5) {
  const sorted = [...groups].sort((a, b) => b.total - a.total);
  const visible = sorted.slice(0, limit);
  const othersTotal = sorted.slice(limit).reduce((total, item) => total + item.total, 0);
  return othersTotal > 0 ? [...visible, { nombre: 'Otros', total: othersTotal }] : visible;
}

function DistributionBars({
  emptyMessage,
  groups,
  limit,
}: {
  emptyMessage: string;
  groups: DashboardGroup[];
  limit?: number;
}) {
  const visibleGroups = limit ? topGroupsWithOthers(groups, limit) : groups;
  const maxValue = Math.max(...visibleGroups.map((item) => item.total), 1);

  if (visibleGroups.length === 0) return <p className="table-empty">{emptyMessage}</p>;

  return (
    <div className="dashboard-rodeo-bars">
      {visibleGroups.map((item) => (
        <div className="dashboard-rodeo-bar-row" key={item.nombre}>
          <div className="dashboard-rodeo-bar-label">
            <strong>{friendlyEnum(item.nombre)}</strong>
            <span>{item.total}</span>
          </div>
          <div className="dashboard-rodeo-bar-track" aria-hidden="true">
            <span style={{ width: `${(item.total / maxValue) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutDistribution({ groups }: { groups: DashboardGroup[] }) {
  const total = groups.reduce((sum, item) => sum + item.total, 0);

  if (total === 0) return <p className="table-empty">Sin datos para mostrar.</p>;

  let accumulated = 0;
  const gradient = groups
    .map((item, index) => {
      const start = (accumulated / total) * 100;
      accumulated += item.total;
      const end = (accumulated / total) * 100;
      const color = donutColors[index % donutColors.length];
      return `${color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="dashboard-rodeo-donut-wrap">
      <div className="dashboard-rodeo-donut" style={{ background: `conic-gradient(${gradient})` }} aria-hidden="true">
        <div className="dashboard-rodeo-donut-center">
          <strong>{total}</strong>
          <span>Total</span>
        </div>
      </div>
      <div className="dashboard-rodeo-legend">
        {groups.map((item, index) => (
          <span key={item.nombre}>
            <i style={{ background: donutColors[index % donutColors.length] }} />
            {friendlyEnum(item.nombre)}: {item.total}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AdminDashboard({
  periodo,
  fechaDesde,
  fechaHasta,
  periodoError,
  resumen,
  onPeriodoChange,
  onFechaDesdeChange,
  onFechaHastaChange,
  onApplyCustomPeriod,
  onClearCustomPeriod,
}: AdminDashboardProps) {
  const navigate = useNavigate();
  const periodParams = useMemo(() => ({
    fechaDesde: toDateInput(resumen.fechaDesde),
    fechaHasta: toDateInput(resumen.fechaHasta),
  }), [resumen.fechaDesde, resumen.fechaHasta]);

  const stockCritico = resumen.resumenAlimentacion.insumos.filter((insumo) => insumo.estado === 'BAJO' || insumo.estado === 'CRITICO').length;

  const cards = [
    {
      title: 'Cantidad de ventas',
      value: formatNumber(resumen.resumenVentas.cantidadVentas),
      subtitle: 'Ventas realizadas en el período.',
      tone: 'blue' as MetricTone,
      icon: ShoppingCart,
      url: buildUrl(paths.sales, { section: 'historial', ...periodParams }),
    },
    {
      title: 'Facturación',
      value: formatCurrency(resumen.resumenVentas.facturacion),
      subtitle: 'Importe total facturado.',
      tone: 'emerald' as MetricTone,
      icon: DollarSign,
      url: buildUrl(paths.sales, { section: 'historial', ...periodParams }),
    },
    {
      title: 'Nuevos clientes',
      value: formatNumber(resumen.nuevosClientes),
      subtitle: 'Clientes creados en el período.',
      tone: 'indigo' as MetricTone,
      icon: UserPlus,
      url: buildUrl(paths.sales, { section: 'clientes', ...periodParams }),
    },
    {
      title: 'Litros vendidos',
      value: formatNumber(resumen.resumenVentas.litrosVendidos, ' L'),
      subtitle: 'Litros vendidos en el período.',
      tone: 'pink' as MetricTone,
      icon: BarChart3,
      url: buildUrl(paths.sales, { section: 'historial', ...periodParams }),
    },
    {
      title: 'Litros producidos',
      value: formatNumber(resumen.resumenProduccion.litrosProducidos, ' L'),
      subtitle: 'Producción bruta registrada.',
      tone: 'blue' as MetricTone,
      icon: Droplets,
      url: buildUrl(paths.production, { section: 'historial', ...periodParams }),
    },
    {
      title: 'Litros netos',
      value: formatNumber(resumen.resumenProduccion.litrosNetos, ' L'),
      subtitle: 'Producción luego de descartes.',
      tone: 'emerald' as MetricTone,
      icon: PackageCheck,
      url: buildUrl(paths.production, { section: 'historial', ...periodParams }),
    },
    {
      title: 'Descarte',
      value: formatNumber(resumen.resumenProduccion.litrosDescartados, ' L'),
      subtitle: `${formatNumber(resumen.resumenProduccion.porcentajeDescarte, '%')} sobre producción bruta.`,
      tone: 'amber' as MetricTone,
      icon: TrendingDown,
      url: buildUrl(paths.production, { section: 'historial', descartadosMayorA: '0', ...periodParams }),
    },
    {
      title: 'Lotes vencidos',
      value: formatNumber(resumen.lotesVencidosPeriodo),
      subtitle: 'Lotes de leche vencidos.',
      tone: 'rose' as MetricTone,
      icon: Truck,
      url: buildUrl(paths.production, { section: 'lotesLeche', estado: 'VENCIDO', ...periodParams }),
    },
    {
      title: 'Animales activos',
      value: formatNumber(resumen.animalesActivos),
      subtitle: 'Total general activo.',
      tone: 'emerald' as MetricTone,
      icon: Users,
      url: buildUrl(paths.herd, { section: 'animales', estado: 'ACTIVO' }),
    },
    {
      title: 'Stock bajo / agotado',
      value: formatNumber(stockCritico),
      subtitle: 'Insumos con stock crítico.',
      tone: stockCritico > 0 ? 'amber' as MetricTone : 'emerald' as MetricTone,
      icon: Utensils,
      url: buildUrl(paths.feed, { section: 'stock', estadoStock: 'CRITICO' }),
    },
    {
      title: 'Tareas vencidas',
      value: formatNumber(resumen.tareasVencidas),
      subtitle: 'Tareas vencidas del período.',
      tone: resumen.tareasVencidas > 0 ? 'rose' as MetricTone : 'emerald' as MetricTone,
      icon: AlertTriangle,
      url: buildUrl(paths.agenda, { estado: 'VENCIDA', ...periodParams }),
    },
    {
      title: 'Tareas pendientes',
      value: formatNumber(resumen.tareasPendientes),
      subtitle: 'Tareas pendientes del período.',
      tone: 'indigo' as MetricTone,
      icon: ClipboardList,
      url: buildUrl(paths.agenda, { estado: 'PENDIENTE', ...periodParams }),
    },
  ];

  return (
    <>
      <section className="dashboard-period-toolbar">
        <div>
          <h2>Tablero gerencial</h2>
          <p>{periodText(periodo, resumen.fechaDesde, resumen.fechaHasta)}</p>
        </div>
        <div className="dashboard-period-controls">
          <div className="dashboard-period-selector" aria-label="Seleccionar período">
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
          {periodo === 'personalizado' && (
            <div className="dashboard-custom-period">
              <input type="date" value={fechaDesde} onChange={(event) => onFechaDesdeChange(event.target.value)} aria-label="Fecha desde" />
              <input type="date" value={fechaHasta} onChange={(event) => onFechaHastaChange(event.target.value)} aria-label="Fecha hasta" />
              <button type="button" className="secondary-button" onClick={onApplyCustomPeriod}>Aplicar</button>
              <button type="button" className="secondary-button" onClick={onClearCustomPeriod}>Limpiar</button>
            </div>
          )}
          {periodoError && <div className="form-error">{periodoError}</div>}
        </div>
      </section>

      <div className="dashboard-kpi-grid">
        {cards.map((card) => (
          <DashboardKpiCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            tone={card.tone}
            onClick={() => navigate(card.url)}
          />
        ))}
      </div>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Situación actual del rodeo</h2>
            <p>Distribución general de animales registrada en PostgreSQL.</p>
          </div>
        </div>
        <div className="dashboard-rodeo-grid">
          <article className="dashboard-rodeo-panel">
            <h3>Animales por lote</h3>
            <DistributionBars groups={resumen.animalesPorLote} limit={5} emptyMessage="Sin animales por lote para mostrar." />
          </article>
          <article className="dashboard-rodeo-panel">
            <h3>Estado reproductivo</h3>
            <DonutDistribution groups={resumen.animalesPorEstadoReproductivo} />
          </article>
          <article className="dashboard-rodeo-panel">
            <h3>Categorías</h3>
            <DistributionBars groups={resumen.animalesPorCategoria} emptyMessage="Sin categorías para mostrar." />
          </article>
        </div>
      </section>
    </>
  );
}
