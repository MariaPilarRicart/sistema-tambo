import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  DollarSign,
  Droplets,
  LucideIcon,
  PackageCheck,
  Truck,
  Utensils,
} from 'lucide-react';
import { paths } from '../../routes/paths';
import type { DashboardPeriodo, DashboardResumen } from '../../types/dashboard';

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

type AdminModalType = 'stock' | 'tareas' | 'sanidad';

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

function friendlyEnum(value: string | null | undefined) {
  if (!value) return '-';
  const labels: Record<string, string> = {
    AFTOSA: 'Aftosa',
    BRUCELOSIS: 'Brucelosis',
    ANALISIS_BRUCELOSIS: 'Análisis de brucelosis',
    ANALISIS_TUBERCULINA: 'Análisis de tuberculina',
    VACA_PRODUCCION: 'Vaca en producción',
    VACA_SECA: 'Vaca seca',
    PREPARTO: 'Preparto',
    NO_APLICA: 'No aplica',
    VACIA: 'Vacía',
    PRENADA: 'Preñada',
    RECUPERACION: 'Recuperación',
    GUACHERA: 'Guachera',
    ESCUELITA: 'Escuelita',
    TERNERA: 'Ternera',
    VAQUILLONA: 'Vaquillona',
    TORO: 'Toro',
    BAJA: 'Baja',
    ANIMAL: 'Animal',
    LOTE: 'Lote',
    CATEGORIA: 'Categoría',
    PENDIENTE: 'Pendiente',
    VENCIDA: 'Vencido',
    PROXIMA: 'Próximo',
  };
  if (labels[value]) return labels[value];
  const readable = value.toLowerCase().replace(/_/g, ' ');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function trendText(value: string) {
  if (value === 'EN_ALZA') return 'La producción muestra una mejora respecto a los primeros días del período.';
  if (value === 'EN_BAJA') return 'La producción muestra una baja respecto a los primeros días del período.';
  if (value === 'ESTABLE') return 'La producción se mantiene estable en el período.';
  return 'No hay suficientes datos para analizar tendencia.';
}

function sanitaryStatusText(vencidas: number, proximas: number) {
  if (vencidas >= 10) return 'Situación crítica';
  if (vencidas > 0) return 'Atención requerida';
  if (proximas > 0) return 'Revisar controles próximos';
  return 'Sin alertas sanitarias';
}

function sanitaryConclusion(vencidas: number, proximas: number) {
  if (vencidas > 0) return 'Hay controles sanitarios vencidos. Se recomienda revisar vacunación hoy.';
  if (proximas > 0) return 'Los controles próximos están dentro del período de seguimiento.';
  return 'No hay controles sanitarios pendientes para este período.';
}

function KpiCard({
  description,
  icon: Icon,
  onClick,
  title,
  value,
  tone,
  className = '',
}: {
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  title: string;
  value: string;
  tone: 'emerald' | 'blue' | 'indigo' | 'pink' | 'amber' | 'rose';
  className?: string;
}) {
  const content = (
    <>
      <div className="dashboard-kpi-top">
        <div className={`metric-icon metric-icon-${tone}`}>
          <Icon size={20} />
        </div>
        <h3>{value}</h3>
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
    </>
  );

  if (onClick) {
    return (
      <button className={`metric-card dashboard-kpi-card dashboard-kpi-clickable dashboard-kpi-${tone} ${className}`} type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <article className={`metric-card dashboard-kpi-card dashboard-kpi-${tone} ${className}`}>
      {content}
    </article>
  );
}

function SectionCard({ action, children, description, id, title }: { action?: ReactNode; children: ReactNode; description: string; id?: string; title: string }) {
  return (
    <section className="panel dashboard-chart-card" id={id}>
      <div className="dashboard-card-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action}
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
    <div className="dashboard-value-bars">
      {series.map((item) => (
        <div className="dashboard-value-row" key={item.etiqueta}>
          <div className="dashboard-value-label">
            <strong>{item.etiqueta}</strong>
            <span>Producido: {formatNumber(item.litrosProducidos, ' L')} | Neto: {formatNumber(item.litrosNetos, ' L')}</span>
          </div>
          <div className="dashboard-value-track" aria-hidden="true">
            <span style={{ width: `${(item.litrosProducidos / maxValue) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ValueBars({
  emptyMessage,
  items,
}: {
  emptyMessage: string;
  items: Array<{ label: string; value: number; detail?: string }>;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const visibleItems = items.filter((item) => item.value > 0);

  if (visibleItems.length === 0) return <p className="table-empty">{emptyMessage}</p>;

  return (
    <div className="dashboard-value-bars">
      {items.map((item) => (
        <div className="dashboard-value-row" key={item.label}>
          <div className="dashboard-value-label">
            <strong>{item.label}</strong>
            <span>{formatNumber(item.value, ' L')}{item.detail ? ` | ${item.detail}` : ''}</span>
          </div>
          <div className="dashboard-value-track" aria-hidden="true">
            <span style={{ width: `${(item.value / maxValue) * 100}%` }} />
          </div>
        </div>
      ))}
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
  const [activeModal, setActiveModal] = useState<AdminModalType | null>(null);
  const { resumenProduccion, resumenVentas, resumenLeche, resumenAlimentacion, resumenSanidad, resumenRodeo } = resumen;
  const stockBajo = resumenAlimentacion.insumos.filter((insumo) => insumo.stockActual > 0 && insumo.stockActual < insumo.stockMinimo);
  const agotados = resumenAlimentacion.insumos.filter((insumo) => insumo.stockActual === 0);
  const totalAlertasStock = stockBajo.length + agotados.length;
  const totalVencimientosCriticos = resumen.tareasVencidas + resumenSanidad.tareasSanitariasVencidas;
  const stockCardClass = agotados.length > 0
    ? 'dashboard-stock-critical'
    : stockBajo.length > 0
      ? 'dashboard-stock-warning'
      : 'dashboard-stock-ok';
  const commercialReading = resumenVentas.cantidadVentas === 0
    ? 'No se registraron ventas en el período seleccionado.'
    : `Durante el período se vendieron ${formatNumber(resumenVentas.litrosVendidos, ' L')} por un total de ${formatCurrency(resumenVentas.facturacion)}.`;
  const commercialContext = resumenVentas.litrosVendidos > resumenProduccion.litrosProducidos && resumenVentas.litrosVendidos > 0
    ? 'Las ventas del período pueden corresponder a leche producida en días anteriores.'
    : null;
  const commercialSuggestion = resumenVentas.cantidadVentas === 0
    ? 'No hay ventas registradas en el período.'
    : resumenLeche.riesgoVencimiento.vence48Horas.lotes + resumenLeche.riesgoVencimiento.vence7Dias.lotes > 0
      ? 'Revisar lotes próximos a vencer antes de registrar nuevas ventas.'
      : resumenLeche.litrosDisponibles > 0
        ? 'Hay leche disponible para comercializar.'
        : 'Revisar el módulo de ventas para más detalle.';
  const kpis = [
    { title: 'Litros producidos', description: 'Producción total del período', value: formatNumber(resumenProduccion.litrosProducidos, ' L'), icon: Droplets, tone: 'blue' as const },
    { title: 'Litros netos', description: 'Producción menos descarte', value: formatNumber(resumenProduccion.litrosNetos, ' L'), icon: PackageCheck, tone: 'emerald' as const },
    { title: 'Descarte', description: `${formatNumber(resumenProduccion.litrosDescartados, ' L')} descartados`, value: formatNumber(resumenProduccion.porcentajeDescarte, '%'), icon: AlertTriangle, tone: 'amber' as const },
    { title: 'Leche disponible', description: `${resumenLeche.lotesDisponibles} lotes disponibles`, value: formatNumber(resumenLeche.litrosDisponibles, ' L'), icon: Truck, tone: 'indigo' as const },
    { title: 'Litros vendidos', description: `${resumenVentas.cantidadVentas} ventas`, value: formatNumber(resumenVentas.litrosVendidos, ' L'), icon: BarChart3, tone: 'pink' as const },
    { title: 'Facturación', description: `Promedio ${formatNullable(resumenVentas.precioPromedioLitro, ' $/L')}`, value: formatCurrency(resumenVentas.facturacion), icon: DollarSign, tone: 'emerald' as const },
    {
      title: 'Stock',
      description: totalAlertasStock > 0 ? 'Stock crítico' : 'Sin alertas críticas',
      value: String(totalAlertasStock),
      icon: Utensils,
      tone: agotados.length > 0 ? 'rose' as const : stockBajo.length > 0 ? 'amber' as const : 'emerald' as const,
      onClick: () => setActiveModal('stock'),
      className: stockCardClass,
    },
    { title: 'Tareas vencidas', description: 'Agenda + sanidad vencida', value: String(totalVencimientosCriticos), icon: ClipboardList, tone: 'amber' as const },
  ];

  return (
    <>
      <section className="dashboard-period-toolbar">
        <div>
          <h2>Tablero gerencial</h2>
          <p>Período: {formatDate(resumen.fechaDesde)} al {formatDate(resumen.fechaHasta)}</p>
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
        {kpis.map((metric) => (
          <KpiCard key={metric.title} {...metric} />
        ))}
      </div>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Alertas de gestión</h2>
            <p>Alertas accionables para resolver hoy.</p>
          </div>
        </div>
        {resumen.alertasGestion.length === 0 ? (
          <p className="table-empty">Sin alertas de gestión para este período.</p>
        ) : (
          <div className="dashboard-alert-grid">
            {resumen.alertasGestion.map((alerta) => (
              <article className={`alert-card ${severityClass(alerta.severidad)}`} key={alerta.codigo}>
                <AlertTriangle size={18} />
                <div>
                  <strong>{alerta.titulo}</strong>
                  <p>{alerta.detalle}</p>
                  <small>{alerta.accionSugerida}</small>
                  {alerta.codigo === 'TAREAS_VENCIDAS' || alerta.codigo === 'STOCK_CRITICO' || alerta.codigo === 'SANIDAD_PENDIENTE' ? (
                    <button
                      className="dashboard-alert-action"
                      type="button"
                      onClick={() => {
                        if (alerta.codigo === 'STOCK_CRITICO') {
                          setActiveModal('stock');
                          return;
                        }
                        setActiveModal(alerta.codigo === 'TAREAS_VENCIDAS' ? 'tareas' : 'sanidad');
                      }}
                    >
                      Ver detalle
                    </button>
                  ) : (
                    <Link className="dashboard-alert-action" to={alerta.accionRuta}>{alerta.accionLabel}</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="dashboard-two-column">
        <SectionCard title="Producción interpretada" description="Litros producidos por día dentro del período seleccionado.">
          <div className="dashboard-detail-grid">
            <span>Producción total <strong>{formatNumber(resumenProduccion.litrosProducidos, ' L')}</strong></span>
            <span>Producción neta <strong>{formatNumber(resumenProduccion.litrosNetos, ' L')}</strong></span>
            <span>Litros descartados <strong>{formatNumber(resumenProduccion.litrosDescartados, ' L')}</strong></span>
            <span>Porcentaje de descarte <strong>{formatNumber(resumenProduccion.porcentajeDescarte, '%')}</strong></span>
            <span>Ordeñes registrados <strong>{resumenProduccion.cantidadRegistros}</strong></span>
            <span>Vacas con producción <strong>{resumenProduccion.animalesConProduccion}</strong></span>
            <span>Promedio diario producido <strong>{formatNullable(resumenProduccion.promedioDiarioProducido, ' L')}</strong></span>
            <span>Promedio por vaca <strong>{formatNullable(resumenProduccion.promedioLitrosPorAnimal, ' L')}</strong></span>
            <span>Mayor producción del período <strong>{resumenProduccion.diaMayorProduccion ? `${resumenProduccion.diaMayorProduccion.etiqueta} - ${formatNumber(resumenProduccion.diaMayorProduccion.litrosProducidos, ' L')}` : 'Sin datos'}</strong></span>
            <span>Tendencia <strong>{friendlyEnum(resumenProduccion.tendencia)}</strong></span>
          </div>
          <h3 className="dashboard-subtitle">Evolución diaria de producción</h3>
          <p className="dashboard-section-note">Cada barra representa los litros producidos en esa fecha y turno dentro del período seleccionado.</p>
          <SimpleBars emptyMessage="Sin datos registrados para este período." series={resumenProduccion.series} />
          <p className="dashboard-conclusion">{trendText(resumenProduccion.tendencia)}</p>
          <p className="dashboard-section-note">
            Último lote generado: {resumenProduccion.ultimoLote?.codigo ?? 'Sin datos'}.
          </p>
        </SectionCard>

        <SectionCard
          title="Movimiento comercial del período"
          description="Evolución de ventas y lectura comercial del período seleccionado."
          action={<Link className="panel-chip" to={paths.sales}>Ver ventas</Link>}
        >
          <h3 className="dashboard-subtitle">Ventas por período</h3>
          <ValueBars
            emptyMessage="Sin ventas registradas para este período."
            items={resumenVentas.series.map((item) => ({
              label: item.etiqueta,
              value: item.litrosVendidos,
              detail: formatCurrency(item.facturacion),
            }))}
          />
          <p className="dashboard-conclusion">{commercialReading}</p>
          {commercialContext && <p className="dashboard-section-note">{commercialContext}</p>}
          {resumenVentas.ultimaVenta ? (
            <p className="dashboard-section-note">
              Última venta:<br />
              Fecha: {formatDate(resumenVentas.ultimaVenta.fecha)}<br />
              Cliente: {resumenVentas.ultimaVenta.cliente}<br />
              Litros: {formatNumber(resumenVentas.ultimaVenta.litros, ' L')}<br />
              Total: {formatCurrency(resumenVentas.ultimaVenta.total)}
            </p>
          ) : (
            <p className="table-empty">Sin ventas registradas para este período.</p>
          )}
          <p className="dashboard-conclusion">{commercialSuggestion}</p>
        </SectionCard>
      </div>

      <SectionCard
        title="Riesgo de vencimiento de leche"
        description="Resumen de leche disponible según cercanía de vencimiento."
        action={<Link className="panel-chip" to={paths.production}>Ver producción</Link>}
      >
        <div className="dashboard-risk-grid">
          <span>Vencen en las próximas 48 hs <strong>{formatNumber(resumenLeche.riesgoVencimiento.vence48Horas.litros, ' L')} disponibles</strong><small>{resumenLeche.riesgoVencimiento.vence48Horas.lotes} lotes afectados</small></span>
          <span>Vencen en los próximos 7 días <strong>{formatNumber(resumenLeche.riesgoVencimiento.vence7Dias.litros, ' L')} disponibles</strong><small>{resumenLeche.riesgoVencimiento.vence7Dias.lotes} lotes afectados</small></span>
          <span>Sin vencimiento inmediato <strong>{formatNumber(resumenLeche.riesgoVencimiento.sinRiesgo.litros, ' L')} disponibles</strong><small>{resumenLeche.riesgoVencimiento.sinRiesgo.lotes} lotes afectados</small></span>
        </div>
        {resumenLeche.riesgoVencimiento.urgentes.length === 0 ? (
          <p className="table-empty">No hay lotes con leche disponible en riesgo inmediato.</p>
        ) : (
          <div className="dashboard-urgent-list">
            {resumenLeche.riesgoVencimiento.urgentes.map((lote) => (
              <div className="dashboard-urgent-row" key={lote.id}>
                <strong>Lote {lote.codigo}</strong>
                <span>Vence: {formatDate(lote.fechaVencimiento)}</span>
                <span>Disponible: {formatNumber(lote.litrosDisponibles, ' L')}</span>
                <small>Acción sugerida: {lote.accionSugerida}</small>
              </div>
            ))}
          </div>
        )}
        <p className="dashboard-conclusion">Priorizar la venta de los lotes con vencimiento más cercano.</p>
        <Link className="secondary-button dashboard-inline-action" to={paths.sales}>Registrar venta</Link>
      </SectionCard>

      <div className="dashboard-two-column">
        <SectionCard
          title="Sanidad"
          description="Controles urgentes y próximos sin replicar Agenda o Vacunación."
          action={<Link className="panel-chip" to={paths.vaccination}>Ver vacunación</Link>}
        >
          <div className="dashboard-detail-grid">
            <span>Controles vencidos <strong>{resumenSanidad.tareasSanitariasVencidas}</strong></span>
            <span>Controles próximos <strong>{resumenSanidad.tareasSanitariasProximas}</strong></span>
            <span>Controles pendientes <strong>{resumenSanidad.controlesPendientes}</strong></span>
            <span>Estado general <strong>{sanitaryStatusText(resumenSanidad.tareasSanitariasVencidas, resumenSanidad.tareasSanitariasProximas)}</strong></span>
            <span>Más repetido <strong>{friendlyEnum(resumenSanidad.tipoControlMasRepetido)}</strong></span>
            <span>Próximo urgente <strong>{resumenSanidad.proximoControlUrgente ? `${friendlyEnum(resumenSanidad.proximoControlUrgente.tipo)} - ${formatDate(resumenSanidad.proximoControlUrgente.fechaObjetivo)}` : 'Sin datos'}</strong></span>
          </div>
          <p className="dashboard-conclusion">{sanitaryConclusion(resumenSanidad.tareasSanitariasVencidas, resumenSanidad.tareasSanitariasProximas)}</p>
          {resumenSanidad.tareas.length === 0 ? (
            <p className="table-empty">Sin controles sanitarios pendientes o próximos.</p>
          ) : (
            <div className="dashboard-urgent-list">
              {resumenSanidad.tareas.slice(0, 5).map((tarea) => (
                <div className="dashboard-urgent-row" key={tarea.id}>
                  <strong>{friendlyEnum(tarea.tipo)}</strong>
                  <span>{formatDate(tarea.fechaObjetivo)}</span>
                  <span>{friendlyEnum(tarea.lote ?? tarea.categoria ?? tarea.alcance)}</span>
                  <span className="badge badge-warning">{friendlyEnum(tarea.estado)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Situación general del rodeo</h2>
            <p>Resumen general del rodeo.</p>
          </div>
          <Link className="panel-chip" to={paths.herd}>Ver rodeo</Link>
        </div>
        <div className="dashboard-detail-grid dashboard-herd-summary">
          <span>Animales activos <strong>{resumen.animalesActivos}</strong></span>
          <span>Animales inactivos <strong>{resumen.animalesInactivos}</strong></span>
          <span>Vacas en producción <strong>{resumenRodeo.vacasProduccion}</strong></span>
          <span>Vacas secas / preparto <strong>{resumenRodeo.vacasSecasPreparto}</strong></span>
          <span>Vaquillonas <strong>{resumenRodeo.vaquillonas}</strong></span>
        </div>
      </section>

      {activeModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setActiveModal(null)}>
          <section className="modal-panel admin-dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="admin-dashboard-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-card-heading">
              <div>
                <h2 id="admin-dashboard-modal-title">
                  {activeModal === 'stock' ? 'Stock de alimentos' : activeModal === 'tareas' ? 'Agenda pendiente' : 'Controles sanitarios'}
                </h2>
                <p>Detalle para seguimiento y acción desde el módulo correspondiente.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setActiveModal(null)} aria-label="Cerrar modal">
                X
              </button>
            </div>

            {activeModal === 'stock' && (
              <div className="admin-modal-sections">
                <section>
                  <h3>Alimentos bajo mínimo</h3>
                  {stockBajo.length === 0 ? (
                    <p className="table-empty">No hay alimentos bajo mínimo.</p>
                  ) : (
                    <div className="dashboard-urgent-list">
                      {stockBajo.map((insumo) => (
                        <div className="dashboard-urgent-row" key={insumo.id}>
                          <strong>{insumo.alimento}</strong>
                          <span>Stock actual: {formatNumber(insumo.stockActual)} {insumo.unidad}</span>
                          <span>Punto mínimo: {formatNumber(insumo.stockMinimo)} {insumo.unidad}</span>
                          <span className="badge badge-warning">Bajo</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section>
                  <h3>Alimentos agotados</h3>
                  {agotados.length === 0 ? (
                    <p className="table-empty">No hay alimentos agotados.</p>
                  ) : (
                    <div className="dashboard-urgent-list">
                      {agotados.map((insumo) => (
                        <div className="dashboard-urgent-row" key={insumo.id}>
                          <strong>{insumo.alimento}</strong>
                          <span>Stock actual: {formatNumber(insumo.stockActual)} {insumo.unidad}</span>
                          <span>Punto mínimo: {formatNumber(insumo.stockMinimo)} {insumo.unidad}</span>
                          <span className="badge badge-critical">Agotado</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <Link className="secondary-button dashboard-inline-action" to={paths.feed}>Ver alimentación</Link>
              </div>
            )}

            {activeModal === 'tareas' && (
              resumen.tareasVencidasDetalle.length === 0 ? (
                <p className="table-empty">No hay tareas vencidas de agenda.</p>
              ) : (
                <div className="dashboard-urgent-list">
                  {resumen.tareasVencidasDetalle.map((tarea) => (
                    <div className="dashboard-urgent-row" key={tarea.id}>
                      <strong>{friendlyEnum(tarea.tipoTarea)}</strong>
                      <span>{tarea.animal ? `Animal #${tarea.animal.caravana}` : 'Sin animal'}</span>
                      <span>{tarea.animal?.lote?.nombre ?? tarea.lote?.nombre ?? 'Sin lote'}</span>
                      <small>Fecha: {formatDate(tarea.fechaProyectada)} | Estado: {friendlyEnum(tarea.estado)}</small>
                      <Link className="secondary-button" to={paths.agenda}>Ver agenda</Link>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeModal === 'sanidad' && (
              resumenSanidad.tareas.length === 0 ? (
                <p className="table-empty">No hay controles sanitarios pendientes.</p>
              ) : (
                <div className="dashboard-urgent-list">
                  {resumenSanidad.tareas.map((tarea) => (
                    <div className="dashboard-urgent-row" key={tarea.id}>
                      <strong>{friendlyEnum(tarea.tipo)}</strong>
                      <span>{friendlyEnum(tarea.lote ?? tarea.categoria ?? tarea.alcance)}</span>
                      <span>Vence: {formatDate(tarea.fechaObjetivo)}</span>
                      <span className="badge badge-warning">{friendlyEnum(tarea.estado)}</span>
                      <Link className="secondary-button" to={paths.vaccination}>Ver vacunación</Link>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        </div>
      )}
    </>
  );
}
