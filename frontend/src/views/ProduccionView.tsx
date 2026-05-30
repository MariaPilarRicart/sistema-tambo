import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Droplets, Milk, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getAnimales } from '../services/animalesService';
import { getLotes } from '../services/lotesService';
import {
  createProduccion,
  deleteProduccion,
  getProduccionPorAnimal,
  getProduccionPorLote,
  getProducciones,
  getResumenProduccion,
} from '../services/produccionService';
import type { Animal } from '../types/animales';
import type { AuthUser } from '../types/auth';
import type { Lote } from '../types/lotes';
import type {
  MotivoDescarteLeche,
  ProduccionAnimal,
  ProduccionEvolucionDiaria,
  ProduccionFilters,
  ProduccionFormValues,
  ProduccionPorAnimal,
  ProduccionPorLote,
  ProduccionResumen,
  TurnoOrdene,
} from '../types/produccion';

function localDateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

const emptyForm: ProduccionFormValues = {
  animalId: '',
  fechaHora: localDateTimeValue(),
  turno: 'MANANA',
  litrosProducidos: '',
  litrosDescartados: '0',
  motivoDescarte: '',
  observacionDescarte: '',
  temperaturaTanque: '',
  grasa: '',
  proteina: '',
  recuentoCelulasSomaticas: '',
  recuentoBacteriano: '',
  observacionesCalidad: '',
};

const emptyFilters: ProduccionFilters = {
  fechaDesde: new Date().toISOString().slice(0, 10),
  fechaHasta: new Date().toISOString().slice(0, 10),
  animalId: '',
  loteId: '',
  turno: '',
};

const turnoLabels: Record<TurnoOrdene, string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
};

const motivoLabels: Record<MotivoDescarteLeche, string> = {
  MASTITIS: 'Mastitis',
  ANTIBIOTICO: 'Antibiótico',
  CALOSTRO: 'Calostro',
  MALA_CALIDAD: 'Mala calidad',
  CONTAMINACION: 'Contaminación',
  OTRO: 'Otro',
};

interface ProduccionViewProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatLiters(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} l`;
}

function qualityWarnings(values: ProduccionFormValues | ProduccionAnimal) {
  const warnings: string[] = [];
  if (values.temperaturaTanque && Number(values.temperaturaTanque) > 4) warnings.push('Temperatura alta');
  if (values.grasa && Number(values.grasa) < 2.8) warnings.push('Grasa baja');
  if (values.proteina && Number(values.proteina) < 2.8) warnings.push('Proteína baja');
  if (values.recuentoCelulasSomaticas && Number(values.recuentoCelulasSomaticas) > 400000) {
    warnings.push('Células somáticas altas');
  }
  if (values.recuentoBacteriano && Number(values.recuentoBacteriano) > 100000) {
    warnings.push('Recuento bacteriano alto');
  }
  return warnings;
}

function netLiters(registro: ProduccionAnimal) {
  return Number(registro.litrosProducidos) - Number(registro.litrosDescartados);
}

function LineChart({ data }: { data: ProduccionEvolucionDiaria[] }) {
  const points = data.slice(-14);
  const maxValue = Math.max(...points.map((item) => item.litrosNetos), 1);
  const width = 720;
  const height = 220;
  const padding = 28;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const path = points
    .map((item, index) => {
      const x = padding + index * step;
      const y = height - padding - (item.litrosNetos / maxValue) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="production-chart">
      {points.length > 0 ? (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución de producción neta">
          <path className="production-chart-grid" d={`M ${padding} ${height - padding} H ${width - padding}`} />
          <path className="production-chart-line" d={path} />
          {points.map((item, index) => {
            const x = padding + index * step;
            const y = height - padding - (item.litrosNetos / maxValue) * (height - padding * 2);
            return <circle key={item.fecha} cx={x} cy={y} r="4" />;
          })}
        </svg>
      ) : (
        <p className="table-empty">Sin datos para graficar.</p>
      )}
    </div>
  );
}

export function ProduccionView({ authToken, currentUser, onUnauthorized }: ProduccionViewProps) {
  const [registros, setRegistros] = useState<ProduccionAnimal[]>([]);
  const [resumen, setResumen] = useState<ProduccionResumen | null>(null);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [form, setForm] = useState<ProduccionFormValues>(emptyForm);
  const [filters, setFilters] = useState<ProduccionFilters>(emptyFilters);
  const [animalSearch, setAnimalSearch] = useState('');
  const [statsAnimalId, setStatsAnimalId] = useState('');
  const [statsLoteId, setStatsLoteId] = useState('');
  const [animalStats, setAnimalStats] = useState<ProduccionPorAnimal | null>(null);
  const [loteStats, setLoteStats] = useState<ProduccionPorLote | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const hasDiscard = Number(form.litrosDescartados || 0) > 0;
  const formQualityWarnings = useMemo(() => qualityWarnings(form), [form]);

  const productiveAnimals = useMemo(
    () =>
      animales.filter((animal) => {
        const lote = animal.lote.nombre.toLocaleLowerCase('es-AR');
        return animal.activo && animal.estadoAnimal === 'ACTIVO' && (animal.categoria === 'VACA' || lote === 'producción' || lote === 'produccion' || lote === 'lecheras');
      }),
    [animales],
  );

  const filteredAnimals = useMemo(() => {
    const search = animalSearch.trim().toLocaleLowerCase('es-AR');
    if (!search) return productiveAnimals;
    return productiveAnimals.filter((animal) =>
      `${animal.caravana} ${animal.nombre ?? ''} ${animal.lote.nombre}`.toLocaleLowerCase('es-AR').includes(search),
    );
  }, [animalSearch, productiveAnimals]);

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  async function loadData(nextFilters = filters) {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      const [nextRegistros, nextResumen, nextAnimales, nextLotes] = await Promise.all([
        getProducciones(authToken, nextFilters),
        getResumenProduccion(authToken),
        getAnimales(authToken, { caravana: '', loteId: '', estadoReproductivo: '', estadoAnimal: '', activo: 'true' }),
        getLotes(authToken),
      ]);
      setRegistros(nextRegistros);
      setResumen(nextResumen);
      setAnimales(nextAnimales);
      setLotes(nextLotes);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar producción.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await createProduccion(authToken, form);
      setForm({ ...emptyForm, fechaHora: localDateTimeValue() });
      setAnimalSearch('');
      setSuccess('Producción registrada correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar la producción.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadData(filters);
  }

  async function handleDelete(registro: ProduccionAnimal) {
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await deleteProduccion(authToken, registro.id);
      setSuccess('Registro eliminado correctamente.');
      await loadData();
    } catch (deleteError) {
      handleRequestError(deleteError, 'No se pudo eliminar el registro.');
    } finally {
      setIsSaving(false);
    }
  }

  async function loadAnimalStats(animalId: string) {
    setStatsAnimalId(animalId);
    setAnimalStats(null);
    if (!authToken || !animalId) return;
    try {
      setAnimalStats(await getProduccionPorAnimal(authToken, Number(animalId)));
    } catch (statsError) {
      handleRequestError(statsError, 'No se pudo cargar la estadística del animal.');
    }
  }

  async function loadLoteStats(loteId: string) {
    setStatsLoteId(loteId);
    setLoteStats(null);
    if (!authToken || !loteId) return;
    try {
      setLoteStats(await getProduccionPorLote(authToken, Number(loteId)));
    } catch (statsError) {
      handleRequestError(statsError, 'No se pudo cargar la estadística del lote.');
    }
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Producción</h2>
          <p>Producción individual por vaca, descarte y calidad básica de leche.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar producción">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="operative-summary-grid production-summary-grid">
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-emerald"><Milk size={20} /></div>
          <p className="metric-title">Producción neta del día</p>
          <strong className="metric-value">{formatLiters(resumen?.totalLitrosNetos)}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-amber"><Droplets size={20} /></div>
          <p className="metric-title">Litros descartados</p>
          <strong className="metric-value">{formatLiters(resumen?.totalLitrosDescartados)}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-blue"><Activity size={20} /></div>
          <p className="metric-title">Promedio por animal</p>
          <strong className="metric-value">{formatLiters(resumen?.promedioPorAnimal)}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-indigo"><BarChart3 size={20} /></div>
          <p className="metric-title">Animales registrados</p>
          <strong className="metric-value">{resumen?.cantidadAnimalesRegistrados ?? 0}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-rose"><AlertTriangle size={20} /></div>
          <p className="metric-title">Alertas bajo rendimiento</p>
          <strong className="metric-value">{resumen?.alertasBajoRendimiento.length ?? 0}</strong>
        </article>
      </div>

      <div className="feed-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Cargar ordeñe</h2>
              <p>Registro individual por vaca y turno.</p>
            </div>
          </div>
          <form className="user-form production-form" onSubmit={handleSubmit}>
            <label className="production-wide-field">
              <span>Buscar animal por caravana</span>
              <input value={animalSearch} onChange={(event) => setAnimalSearch(event.target.value)} placeholder="Ej: 142" />
            </label>
            <label className="production-wide-field">
              <span>Animal</span>
              <select value={form.animalId} onChange={(event) => setForm({ ...form, animalId: event.target.value })} required>
                <option value="">Seleccionar vaca</option>
                {filteredAnimals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    #{animal.caravana} {animal.nombre ? `- ${animal.nombre}` : ''} ({animal.lote.nombre})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Fecha y hora del ordeñe</span>
              <input type="datetime-local" value={form.fechaHora} onChange={(event) => setForm({ ...form, fechaHora: event.target.value })} required />
            </label>
            <label>
              <span>Turno de ordeñe</span>
              <select value={form.turno} onChange={(event) => setForm({ ...form, turno: event.target.value as TurnoOrdene })} required>
                {Object.entries(turnoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Litros producidos</span>
              <input type="number" min="0" step="0.01" value={form.litrosProducidos} onChange={(event) => setForm({ ...form, litrosProducidos: event.target.value })} required />
            </label>
            <label>
              <span>Litros descartados</span>
              <input type="number" min="0" step="0.01" value={form.litrosDescartados} onChange={(event) => setForm({ ...form, litrosDescartados: event.target.value })} required />
            </label>
            {hasDiscard && (
              <>
                <label>
                  <span>Motivo de descarte</span>
                  <select value={form.motivoDescarte} onChange={(event) => setForm({ ...form, motivoDescarte: event.target.value as ProduccionFormValues['motivoDescarte'] })} required>
                    <option value="">Seleccionar motivo</option>
                    {Object.entries(motivoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Observación de descarte</span>
                  <input value={form.observacionDescarte} onChange={(event) => setForm({ ...form, observacionDescarte: event.target.value })} />
                </label>
              </>
            )}
            <label>
              <span>Temperatura del tanque</span>
              <input type="number" min="0" step="0.1" value={form.temperaturaTanque} onChange={(event) => setForm({ ...form, temperaturaTanque: event.target.value })} />
            </label>
            <label>
              <span>Grasa</span>
              <input type="number" min="0" step="0.01" value={form.grasa} onChange={(event) => setForm({ ...form, grasa: event.target.value })} />
            </label>
            <label>
              <span>Proteína</span>
              <input type="number" min="0" step="0.01" value={form.proteina} onChange={(event) => setForm({ ...form, proteina: event.target.value })} />
            </label>
            <label>
              <span>Recuento de células somáticas</span>
              <input type="number" min="0" step="1" value={form.recuentoCelulasSomaticas} onChange={(event) => setForm({ ...form, recuentoCelulasSomaticas: event.target.value })} />
            </label>
            <label>
              <span>Recuento bacteriano</span>
              <input type="number" min="0" step="1" value={form.recuentoBacteriano} onChange={(event) => setForm({ ...form, recuentoBacteriano: event.target.value })} />
            </label>
            <label className="production-wide-field">
              <span>Observaciones de calidad</span>
              <textarea value={form.observacionesCalidad} onChange={(event) => setForm({ ...form, observacionesCalidad: event.target.value })} rows={3} />
            </label>
            {formQualityWarnings.length > 0 && (
              <div className="form-warning production-wide-field">
                {formQualityWarnings.join('. ')}. Se permite guardar, pero conviene revisar la calidad.
              </div>
            )}
            <button type="submit" className="primary-button production-wide-field" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? 'Guardando...' : 'Guardar producción'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Alertas</h2>
              <p>Rendimiento, descarte, calidad y registros faltantes.</p>
            </div>
          </div>
          <div className="alert-list">
            {(resumen?.alertasBajoRendimiento ?? []).map((alerta) => (
              <article className="alert-card alert-critical" key={`bajo-${alerta.animalId}`}>
                <AlertTriangle size={18} />
                <div><strong>Bajo rendimiento</strong><p>{alerta.mensaje}</p></div>
              </article>
            ))}
            {resumen?.alertaDescarte && (
              <article className="alert-card alert-warning">
                <Droplets size={18} />
                <div><strong>Descarte de leche</strong><p>Hoy se registraron {formatLiters(resumen.totalLitrosDescartados)} descartados.</p></div>
              </article>
            )}
            {(resumen?.alertasCalidad ?? []).map((alerta) => (
              <article className="alert-card alert-info" key={alerta}>
                <Activity size={18} />
                <div><strong>Calidad fuera de rango</strong><p>{alerta}</p></div>
              </article>
            ))}
            {(resumen?.alertasFaltantes ?? []).slice(0, 5).map((alerta) => (
              <article className="alert-card alert-warning" key={`faltante-${alerta.animalId}`}>
                <Milk size={18} />
                <div><strong>Registro faltante</strong><p>{alerta.mensaje}</p></div>
              </article>
            ))}
            {(resumen?.alertasBajoRendimiento.length ?? 0) === 0 && !resumen?.alertaDescarte && (resumen?.alertasCalidad.length ?? 0) === 0 && (resumen?.alertasFaltantes.length ?? 0) === 0 && (
              <p className="table-empty">Sin alertas activas.</p>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historial</h2>
            <p>Registros individuales de producción.</p>
          </div>
        </div>
        <form className="filters-form events-filters production-filters" onSubmit={handleApplyFilters}>
          <label className="filter-field">
            <span>Fecha desde</span>
            <input type="date" value={filters.fechaDesde} onChange={(event) => setFilters({ ...filters, fechaDesde: event.target.value })} />
          </label>
          <label className="filter-field">
            <span>Fecha hasta</span>
            <input type="date" value={filters.fechaHasta} onChange={(event) => setFilters({ ...filters, fechaHasta: event.target.value })} />
          </label>
          <label className="filter-field">
            <span>Animal</span>
            <select value={filters.animalId} onChange={(event) => setFilters({ ...filters, animalId: event.target.value })}>
              <option value="">Todos</option>
              {productiveAnimals.map((animal) => <option key={animal.id} value={animal.id}>#{animal.caravana}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Lote</span>
            <select value={filters.loteId} onChange={(event) => setFilters({ ...filters, loteId: event.target.value })}>
              <option value="">Todos</option>
              {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Turno</span>
            <select value={filters.turno} onChange={(event) => setFilters({ ...filters, turno: event.target.value })}>
              <option value="">Todos</option>
              {Object.entries(turnoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button type="submit" className="secondary-button">Filtrar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando producción...</p> : (
          <div className="table-wrap">
            <table className="users-table production-history-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Caravana</th>
                  <th>Lote</th>
                  <th>Turno</th>
                  <th>Producidos</th>
                  <th>Descartados</th>
                  <th>Neta</th>
                  <th>Motivo</th>
                  <th>Calidad</th>
                  <th>Usuario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => {
                  const warnings = qualityWarnings(registro);
                  return (
                    <tr key={registro.id}>
                      <td>{formatDateTime(registro.fechaHora)}</td>
                      <td><strong>#{registro.animal.caravana}</strong><span>{registro.animal.nombre ?? 'Sin nombre'}</span></td>
                      <td>{registro.animal.lote.nombre}</td>
                      <td>{turnoLabels[registro.turno]}</td>
                      <td>{formatLiters(registro.litrosProducidos)}</td>
                      <td>{formatLiters(registro.litrosDescartados)}</td>
                      <td><strong>{formatLiters(netLiters(registro))}</strong></td>
                      <td>{registro.motivoDescarte ? motivoLabels[registro.motivoDescarte] : '-'}</td>
                      <td><span className={`status-pill ${warnings.length > 0 ? 'status-warning' : 'status-active'}`}>{warnings.length > 0 ? 'Revisar' : 'Normal'}</span></td>
                      <td>{registro.usuario?.nombre ?? '-'}</td>
                      <td>
                        {isAdmin && (
                          <div className="table-actions">
                            <button type="button" onClick={() => void handleDelete(registro)} aria-label="Eliminar registro">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {registros.length === 0 && <tr><td colSpan={11}>Sin registros de producción.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="feed-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Estadísticas por animal</h2>
              <p>Seleccioná una caravana para ver su rendimiento.</p>
            </div>
          </div>
          <label className="filter-field production-selector">
            <span>Caravana</span>
            <select value={statsAnimalId} onChange={(event) => void loadAnimalStats(event.target.value)}>
              <option value="">Seleccionar animal</option>
              {productiveAnimals.map((animal) => <option key={animal.id} value={animal.id}>#{animal.caravana} ({animal.lote.nombre})</option>)}
            </select>
          </label>
          {animalStats ? (
            <>
              <div className="dashboard-kpi-grid production-stats-grid">
                <article className="dashboard-kpi-card dashboard-kpi-emerald"><strong>Total producido</strong><h3>{formatLiters(animalStats.totalProducido)}</h3></article>
                <article className="dashboard-kpi-card dashboard-kpi-blue"><strong>Promedio diario</strong><h3>{formatLiters(animalStats.promedioDiario)}</h3></article>
                <article className="dashboard-kpi-card dashboard-kpi-indigo"><strong>Promedio por ordeñe</strong><h3>{formatLiters(animalStats.promedioPorOrdene)}</h3></article>
                <article className="dashboard-kpi-card dashboard-kpi-amber"><strong>Descartados</strong><h3>{formatLiters(animalStats.litrosDescartadosTotales)}</h3></article>
              </div>
              {animalStats.bajoRendimiento && <div className="form-warning">La vaca #{animalStats.animal.caravana} viene rindiendo por debajo del promedio del lote.</div>}
              <LineChart data={animalStats.evolucion} />
            </>
          ) : <p className="table-empty">Seleccioná un animal para ver estadísticas.</p>}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Estadísticas por lote</h2>
              <p>Total, promedio y ranking de producción.</p>
            </div>
          </div>
          <label className="filter-field production-selector">
            <span>Lote</span>
            <select value={statsLoteId} onChange={(event) => void loadLoteStats(event.target.value)}>
              <option value="">Seleccionar lote</option>
              {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
            </select>
          </label>
          {loteStats ? (
            <>
              <div className="dashboard-kpi-grid production-stats-grid">
                <article className="dashboard-kpi-card dashboard-kpi-emerald"><strong>Total del lote</strong><h3>{formatLiters(loteStats.totalProducido)}</h3></article>
                <article className="dashboard-kpi-card dashboard-kpi-blue"><strong>Promedio por animal</strong><h3>{formatLiters(loteStats.promedioPorAnimal)}</h3></article>
              </div>
              <div className="compact-bars">
                {loteStats.rankingAnimales.slice(0, 8).map((item) => (
                  <div className="compact-bar-row" key={item.animal.id}>
                    <div className="compact-bar-label">
                      <strong>#{item.animal.caravana}</strong>
                      <span>{formatLiters(item.totalProducido)}</span>
                    </div>
                    <div className="compact-bar-track" aria-hidden="true">
                      <span style={{ width: `${Math.min((item.totalProducido / Math.max(loteStats.rankingAnimales[0]?.totalProducido ?? 1, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {loteStats.animalesBajoRendimiento.length > 0 && <div className="form-warning">{loteStats.animalesBajoRendimiento.length} animales con bajo rendimiento sostenido.</div>}
              <LineChart data={loteStats.evolucionDiaria} />
            </>
          ) : <p className="table-empty">Seleccioná un lote para ver estadísticas.</p>}
        </section>
      </div>
    </div>
  );
}
