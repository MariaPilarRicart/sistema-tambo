import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby,
  ClipboardCheck,
  Droplets,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Utensils,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '../../routes/paths';
import type { DashboardEmpleadoResumen, DashboardPeriodo, MetricTone } from '../../types/dashboard';

interface EmployeeDashboardProps {
  periodo: DashboardPeriodo;
  fechaDesde: string;
  fechaHasta: string;
  periodoError: string;
  resumen: DashboardEmpleadoResumen;
  onPeriodoChange: (periodo: DashboardPeriodo) => void;
  onFechaDesdeChange: (fecha: string) => void;
  onFechaHastaChange: (fecha: string) => void;
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

export function EmployeeDashboard({
  fechaDesde,
  fechaHasta,
  onApplyCustomPeriod,
  onClearCustomPeriod,
  onFechaDesdeChange,
  onFechaHastaChange,
  onPeriodoChange,
  periodo,
  periodoError,
  resumen,
}: EmployeeDashboardProps) {
  const navigate = useNavigate();
  const periodParams = useMemo(() => ({
    fechaDesde: toDateInput(resumen.fechaDesde),
    fechaHasta: toDateInput(resumen.fechaHasta),
  }), [resumen.fechaDesde, resumen.fechaHasta]);

  const cards = [
    {
      title: 'Animales activos',
      value: formatNumber(resumen.animalesActivos),
      subtitle: 'Total general activo.',
      tone: 'emerald' as MetricTone,
      icon: Users,
      url: buildUrl(paths.herd, { section: 'animales', estadoAnimal: 'ACTIVO', activo: 'true' }),
    },
    {
      title: 'Vacas preñadas',
      value: formatNumber(resumen.vacasPrenadas),
      subtitle: 'Total actual.',
      tone: 'pink' as MetricTone,
      icon: HeartPulse,
      url: buildUrl(paths.herd, { section: 'animales', estadoReproductivo: 'PRENADA' }),
    },
    {
      title: 'Vacas inseminadas',
      value: formatNumber(resumen.vacasInseminadas),
      subtitle: 'Total actual.',
      tone: 'indigo' as MetricTone,
      icon: Stethoscope,
      url: buildUrl(paths.herd, { section: 'animales', estadoReproductivo: 'INSEMINADA' }),
    },
    {
      title: 'Vacas secas',
      value: formatNumber(resumen.vacasSecas),
      subtitle: 'Total actual.',
      tone: 'amber' as MetricTone,
      icon: ShieldCheck,
      url: buildUrl(paths.herd, { section: 'animales', categoriaAnimal: 'VACA_SECA' }),
    },
    {
      title: 'Nacimientos',
      value: formatNumber(resumen.nacimientos),
      subtitle: 'Animales nacidos en el periodo.',
      tone: 'amber' as MetricTone,
      icon: Baby,
      url: buildUrl(paths.herd, {
        section: 'animales',
        fechaNacimientoDesde: periodParams.fechaDesde,
        fechaNacimientoHasta: periodParams.fechaHasta,
      }),
    },
    {
      title: 'Partos pendientes',
      value: formatNumber(resumen.partosPendientes),
      subtitle: 'Partos pendientes actuales.',
      tone: 'indigo' as MetricTone,
      icon: Baby,
      url: buildUrl(paths.agenda, { tipo: 'PARTO', estado: 'PENDIENTE' }),
    },
    {
      title: 'Tactos pendientes',
      value: formatNumber(resumen.tactosPendientes),
      subtitle: 'Tactos pendientes actuales.',
      tone: 'emerald' as MetricTone,
      icon: Stethoscope,
      url: buildUrl(paths.agenda, { tipo: 'TACTO', estado: 'PENDIENTE' }),
    },
    {
      title: 'Secados pendientes',
      value: formatNumber(resumen.secadosPendientes),
      subtitle: 'Secados pendientes actuales.',
      tone: 'blue' as MetricTone,
      icon: ClipboardCheck,
      url: buildUrl(paths.agenda, { tipo: 'SECADO', estado: 'PENDIENTE' }),
    },
    {
      title: 'Vacunas pendientes',
      value: formatNumber(resumen.vacunacionPendiente),
      subtitle: 'Vacunas pendientes actuales.',
      tone: 'pink' as MetricTone,
      icon: Syringe,
      url: buildUrl(paths.vaccination, { section: 'pendientes', estado: 'PENDIENTE' }),
    },
    {
      title: 'Vacunas vencidas',
      value: formatNumber(resumen.vacunasVencidas),
      subtitle: 'Vacunas vencidas actuales.',
      tone: 'rose' as MetricTone,
      icon: Syringe,
      url: buildUrl(paths.vaccination, { section: 'historial', estado: 'VENCIDA' }),
    },
    {
      title: 'Alimentaciones registradas',
      value: formatNumber(resumen.alimentacionesRegistradas),
      subtitle: 'Cargas de todos los usuarios.',
      tone: 'emerald' as MetricTone,
      icon: Utensils,
      url: buildUrl(paths.feed, { section: 'historial', ...periodParams }),
    },
    {
      title: 'Lotes de leche vencidos',
      value: formatNumber(resumen.lotesVencidos),
      subtitle: 'Lotes de leche vencidos.',
      tone: 'amber' as MetricTone,
      icon: Droplets,
      url: buildUrl(paths.production, { section: 'lotesLeche', estado: 'VENCIDO', ...periodParams }),
    },
  ];

  return (
    <>
      <section className="dashboard-period-toolbar">
        <div>
          <h2>Tablero operativo</h2>
          <p>{periodText(periodo, resumen.fechaDesde, resumen.fechaHasta)}</p>
        </div>
        <div className="dashboard-period-controls">
          <div className="dashboard-period-selector" aria-label="Seleccionar periodo">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={periodo === option.value ? 'dashboard-period-active' : ''}
                onClick={() => onPeriodoChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {periodo === 'personalizado' && (
            <div className="dashboard-custom-period">
              <input type="date" value={fechaDesde} onChange={(event) => onFechaDesdeChange(event.target.value)} />
              <input type="date" value={fechaHasta} onChange={(event) => onFechaHastaChange(event.target.value)} />
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
    </>
  );
}
