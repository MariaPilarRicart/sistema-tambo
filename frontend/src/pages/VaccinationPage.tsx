import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Clock3, FilterX, RefreshCcw, Syringe } from 'lucide-react';
import { AgendaTaskActions } from '../components/ui/AgendaTaskActions';
import { ApiError } from '../services/apiClient';
import { getAnimales } from '../services/animalesService';
import { getLotes } from '../services/lotesService';
import {
  getVaccinationHistory,
  getVaccinationSummary,
  scheduleVaccination,
  type EstadoSanitario,
  type ScheduleVaccinationValues,
  type VaccinationFilters,
  type VaccinationHistoryItem,
  type VaccinationSummary,
} from '../services/vacunacionService';
import type { AgendaTarea, TipoSanitario } from '../types/agenda';
import type { Animal, CategoriaAnimal } from '../types/animales';
import type { AuthUser } from '../types/auth';
import type { Lote } from '../types/lotes';

const categoriaOptions: CategoriaAnimal[] = ['GUACHERA', 'ESCUELITA', 'TERNERA', 'VAQUILLONA', 'VACA_PRODUCCION', 'VACA_SECA', 'PREPARTO', 'TORO'];
const tipoSanitarioOptions: TipoSanitario[] = ['AFTOSA', 'BRUCELOSIS', 'ANALISIS_TUBERCULINA', 'ANALISIS_BRUCELOSIS', 'OTRA'];
const estadoOptions: EstadoSanitario[] = ['PROGRAMADA', 'PENDIENTE', 'REALIZADA', 'VENCIDA'];
type ScheduleMode = 'individual' | 'lote' | 'categoria';

const scheduleModes: Array<{ value: ScheduleMode; label: string; helper: string }> = [
  { value: 'individual', label: 'Animales individuales', helper: 'Buscar y seleccionar animales activos puntuales.' },
  { value: 'lote', label: 'Lote completo', helper: 'Se programará para todos los animales activos del lote seleccionado.' },
  { value: 'categoria', label: 'Categoría', helper: 'Se programará para todos los animales activos de la categoría seleccionada.' },
];

const emptyScheduleForm: ScheduleVaccinationValues = {
  fechaProgramada: '',
  tipoSanitario: '',
  descripcion: '',
  animalIds: [],
  loteId: '',
  categoria: '',
};

const emptyFilters: VaccinationFilters = {
  estado: '',
  tipo: '',
  fechaDesde: '',
  fechaHasta: '',
};

interface VaccinationPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('es-AR') : '-';
}

function formatTipoSanitario(value: string | null | undefined) {
  if (!value) return '-';
  const labels: Record<string, string> = {
    AFTOSA: 'Aftosa',
    BRUCELOSIS: 'Brucelosis',
    ANALISIS_TUBERCULINA: 'Análisis de tuberculina',
    ANALISIS_BRUCELOSIS: 'Análisis de brucelosis',
    OTRA: 'Otra',
  };
  return labels[value] ?? value;
}

function formatEstado(value: EstadoSanitario) {
  const labels: Record<EstadoSanitario, string> = {
    PROGRAMADA: 'Programada',
    PENDIENTE: 'Pendiente',
    REALIZADA: 'Realizada',
    VENCIDA: 'Vencida',
  };
  return labels[value];
}

function formatCategoria(value: CategoriaAnimal | null | undefined) {
  return value ? value.replaceAll('_', ' ') : '-';
}

function alcanceLabel(item: VaccinationHistoryItem) {
  if (item.alcance.tipo === 'LOTE') return item.alcance.lote?.nombre ? `Lote ${item.alcance.lote.nombre}` : 'Lote';
  if (item.alcance.tipo === 'CATEGORIA') return `Categoría ${formatCategoria(item.alcance.categoriaAnimal)}`;
  return 'Animal';
}

function statusClass(estado: EstadoSanitario) {
  if (estado === 'REALIZADA') return 'status-active';
  if (estado === 'VENCIDA') return 'status-inactive';
  if (estado === 'PROGRAMADA') return 'status-warning';
  return 'status-active';
}

export function VaccinationPage({ authToken, currentUser, onUnauthorized }: VaccinationPageProps) {
  const [pendingHistory, setPendingHistory] = useState<VaccinationHistoryItem[]>([]);
  const [history, setHistory] = useState<VaccinationHistoryItem[]>([]);
  const [summary, setSummary] = useState<VaccinationSummary>({ pendientes: 0, vencidas: 0, realizadas: 0, programadas: 0, todas: 0 });
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [filters, setFilters] = useState<VaccinationFilters>(emptyFilters);
  const [formValues, setFormValues] = useState<ScheduleVaccinationValues>(emptyScheduleForm);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('individual');
  const [animalSearch, setAnimalSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeAnimals = useMemo(() => animals.filter((animal) => animal.activo && animal.estadoAnimal === 'ACTIVO'), [animals]);
  const filteredAnimals = useMemo(() => {
    const query = animalSearch.trim().toLowerCase();
    if (query.length < 2) return [];
    return activeAnimals
      .filter((animal) => animal.caravana.toLowerCase().includes(query) || (animal.nombre ?? '').toLowerCase().includes(query))
      .slice(0, 20);
  }, [activeAnimals, animalSearch]);
  const selectedAnimals = useMemo(() => activeAnimals.filter((animal) => formValues.animalIds.includes(animal.id)), [activeAnimals, formValues.animalIds]);
  const matchingActiveAnimalsCount = useMemo(() => {
    if (scheduleMode === 'individual') return selectedAnimals.length;
    if (scheduleMode === 'lote' && !formValues.loteId) return 0;
    if (scheduleMode === 'categoria' && !formValues.categoria) return 0;
    return activeAnimals.filter((animal) => {
      if (scheduleMode === 'lote') return formValues.loteId && String(animal.loteId) === formValues.loteId;
      return formValues.categoria && animal.categoriaAnimal === formValues.categoria;
    }).length;
  }, [activeAnimals, formValues.categoria, formValues.loteId, scheduleMode, selectedAnimals.length]);
  const selectedMode = scheduleModes.find((mode) => mode.value === scheduleMode)!;
  const shouldSearchAnimals = animalSearch.trim().length >= 2;
  const isScheduleSelectionValid = scheduleMode === 'individual' ? selectedAnimals.length > 0 : matchingActiveAnimalsCount > 0;
  const canSubmitSchedule = Boolean(formValues.fechaProgramada) && Boolean(formValues.tipoSanitario) && isScheduleSelectionValid && !isSaving;

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
      const [nextTasks, nextHistory, nextSummary, nextAnimals, nextLotes] = await Promise.all([
        getVaccinationHistory(authToken, { estado: 'PENDIENTE' }),
        getVaccinationHistory(authToken, nextFilters),
        getVaccinationSummary(authToken),
        getAnimales(authToken, { caravana: '', categoriaAnimal: '', loteId: '', estadoReproductivo: '', estadoAnimal: '', activo: 'true' }),
        getLotes(authToken),
      ]);
      setPendingHistory(nextTasks.registros);
      setHistory(nextHistory.registros);
      setSummary(nextSummary);
      setAnimals(nextAnimals);
      setLotes(nextLotes);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar vacunación.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  function toggleAnimalSelection(animalId: number) {
    const exists = formValues.animalIds.includes(animalId);
    setFormValues({
      ...formValues,
      animalIds: exists ? formValues.animalIds.filter((id) => id !== animalId) : [...formValues.animalIds, animalId],
    });
  }

  function changeScheduleMode(nextMode: ScheduleMode) {
    setScheduleMode(nextMode);
    setAnimalSearch('');
    setFormValues({ ...formValues, animalIds: [], loteId: '', categoria: '' });
    setError('');
  }

  function applyStatusFilter(estado: EstadoSanitario | '') {
    const nextFilters = estado ? { ...filters, estado } : emptyFilters;
    setFilters(nextFilters);
    void loadData(nextFilters);
  }

  async function handleFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadData(filters);
  }

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!formValues.fechaProgramada) throw new Error('Seleccioná una fecha programada.');
      if (!formValues.tipoSanitario) throw new Error('Seleccioná un tipo sanitario.');
      if (!isScheduleSelectionValid) throw new Error('No hay animales activos para la selección indicada.');
      const payload: ScheduleVaccinationValues = {
        fechaProgramada: formValues.fechaProgramada,
        tipoSanitario: formValues.tipoSanitario,
        descripcion: formValues.descripcion,
        animalIds: scheduleMode === 'individual' ? formValues.animalIds : [],
        loteId: scheduleMode === 'lote' ? formValues.loteId : '',
        categoria: scheduleMode === 'categoria' ? formValues.categoria : '',
      };
      const result = await scheduleVaccination(authToken, payload);
      setFormValues(emptyScheduleForm);
      setAnimalSearch('');
      setSuccess(`Vacunación programada: ${result.tareasCreadas} tareas creadas.`);
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo programar la vacunación.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Control de Vacunación</h2>
          <p>Programación, seguimiento e historial sanitario.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar vacunación">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="operative-summary-grid">
        <button type="button" className="metric-card operative-card vaccination-summary-card" onClick={() => applyStatusFilter('PENDIENTE')}>
          <div className="metric-icon metric-icon-emerald"><Syringe size={20} /></div><p className="metric-title">Pendientes</p><strong className="metric-value">{summary.pendientes}</strong>
        </button>
        <button type="button" className="metric-card operative-card vaccination-summary-card" onClick={() => applyStatusFilter('VENCIDA')}>
          <div className="metric-icon metric-icon-rose"><Clock3 size={20} /></div><p className="metric-title">Vencidas</p><strong className="metric-value">{summary.vencidas}</strong>
        </button>
        <button type="button" className="metric-card operative-card vaccination-summary-card" onClick={() => applyStatusFilter('REALIZADA')}>
          <div className="metric-icon metric-icon-blue"><CheckCircle2 size={20} /></div><p className="metric-title">Realizadas</p><strong className="metric-value">{summary.realizadas}</strong>
        </button>
        <button type="button" className="metric-card operative-card vaccination-summary-card" onClick={() => applyStatusFilter('PROGRAMADA')}>
          <div className="metric-icon metric-icon-indigo"><CalendarClock size={20} /></div><p className="metric-title">Programadas</p><strong className="metric-value">{summary.programadas}</strong>
        </button>
      </div>

      <section className="panel">
        <div className="panel-header"><div><h2>Programar vacunación</h2><p>Crear tareas sanitarias para animales activos.</p></div></div>
        <form className="user-form vaccination-form" onSubmit={handleScheduleSubmit}>
          <div className="vaccination-mode-selector">
            {scheduleModes.map((mode) => (
              <button type="button" key={mode.value} className={scheduleMode === mode.value ? 'vaccination-mode-active' : ''} onClick={() => changeScheduleMode(mode.value)}>
                {mode.label}
              </button>
            ))}
          </div>
          <label><span>Fecha programada</span><input type="date" value={formValues.fechaProgramada} onChange={(event) => setFormValues({ ...formValues, fechaProgramada: event.target.value })} required /></label>
          <label>
            <span>Tipo sanitario</span>
            <select value={formValues.tipoSanitario} onChange={(event) => setFormValues({ ...formValues, tipoSanitario: event.target.value as ScheduleVaccinationValues['tipoSanitario'] })} required>
              <option value="">Seleccionar tipo</option>
              {tipoSanitarioOptions.map((tipo) => <option key={tipo} value={tipo}>{formatTipoSanitario(tipo)}</option>)}
            </select>
          </label>
          <label><span>Observaciones</span><input value={formValues.descripcion} onChange={(event) => setFormValues({ ...formValues, descripcion: event.target.value })} placeholder="Ej. Campaña marzo" /></label>

          <div className="vaccination-selection-panel">
            {scheduleMode !== 'individual' && <p className="selection-helper">{selectedMode.helper}</p>}
            {scheduleMode === 'lote' && (
              <label>
                <span>Lote</span>
                <select value={formValues.loteId} onChange={(event) => setFormValues({ ...formValues, loteId: event.target.value })} required>
                  <option value="">Seleccionar lote</option>
                  {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
                </select>
              </label>
            )}
            {scheduleMode === 'categoria' && (
              <label>
                <span>Categoría</span>
                <select value={formValues.categoria} onChange={(event) => setFormValues({ ...formValues, categoria: event.target.value })} required>
                  <option value="">Seleccionar categoría</option>
                  {categoriaOptions.map((categoria) => <option key={categoria} value={categoria}>{formatCategoria(categoria)}</option>)}
                </select>
              </label>
            )}
            {scheduleMode === 'individual' && (
              <div className="animal-selector">
                <label><span>Buscar animal activo</span><input value={animalSearch} onChange={(event) => setAnimalSearch(event.target.value)} placeholder="Ingrese caravana o nombre" /></label>
                <p className="field-help">Escribí al menos 2 caracteres para buscar animales activos.</p>
                {shouldSearchAnimals && (
                  <div>
                    {filteredAnimals.map((animal) => (
                      <label key={animal.id} className="checkbox-row animal-selector-option">
                        <input type="checkbox" checked={formValues.animalIds.includes(animal.id)} onChange={() => toggleAnimalSelection(animal.id)} />
                        <span>#{animal.caravana} {animal.nombre ? `- ${animal.nombre}` : ''}</span>
                      </label>
                    ))}
                    {filteredAnimals.length === 0 && <p className="table-empty">No se encontraron animales activos con ese criterio.</p>}
                  </div>
                )}
                {selectedAnimals.length > 0 && <div className="selected-animals-summary">{selectedAnimals.map((animal) => <button type="button" key={animal.id} onClick={() => toggleAnimalSelection(animal.id)}>#{animal.caravana} x</button>)}</div>}
              </div>
            )}
            {(scheduleMode !== 'individual' || selectedAnimals.length > 0) && (
              <div className={`selection-count ${matchingActiveAnimalsCount > 0 ? 'selection-count-ok' : 'selection-count-empty'}`}>
                {matchingActiveAnimalsCount > 0 ? `${matchingActiveAnimalsCount} animales activos incluidos.` : 'No hay animales activos para la selección actual.'}
              </div>
            )}
          </div>
          <button type="submit" className="primary-button vaccination-submit" disabled={!canSubmitSchedule}><Syringe size={18} />{isSaving ? 'Programando...' : 'Programar vacunación'}</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Vacunaciones pendientes</h2><p>{pendingHistory.length} registros pendientes.</p></div></div>
        {isLoading ? <p className="table-empty">Cargando vacunaciones...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead><tr><th>Fecha</th><th>Animal</th><th>Lote</th><th>Categoría</th><th>Tipo sanitario</th><th>Estado agenda</th><th>Acciones</th></tr></thead>
              <tbody>
                {pendingHistory.map((item) => {
                  const firstTask = item.tareas[0];
                  return (
                  <tr key={item.id}>
                    <td>{formatDate(item.fechaProgramada)}</td>
                    <td>{firstTask ? <Link className="table-link" to={`/rodeos/${firstTask.animal.id}`}>#{firstTask.animal.caravana}</Link> : '-'}</td>
                    <td>{item.alcance.lote?.nombre ?? firstTask?.animal.lote.nombre ?? '-'}</td>
                    <td>{formatCategoria(item.alcance.categoriaAnimal ?? firstTask?.animal.categoriaAnimal)}</td>
                    <td>{formatTipoSanitario(item.tipoSanitario)}</td>
                    <td><span className="status-pill status-active">{formatEstado(item.estado)}</span></td>
                    <td>{firstTask ? <AgendaTaskActions authToken={authToken} currentUser={currentUser} task={firstTask} onChanged={() => void loadData()} onUnauthorized={onUnauthorized} /> : '-'}</td>
                  </tr>
                  );
                })}
                {pendingHistory.length === 0 && <tr><td colSpan={7}>Sin vacunaciones pendientes.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div><h2>Historial de vacunación</h2><p>{history.length} registros encontrados.</p></div>
          <button type="button" className="secondary-button" onClick={() => applyStatusFilter('')}><FilterX size={16} />Todas</button>
        </div>
        <form className="filters-form events-filters production-filters" onSubmit={handleFilters}>
          <label className="filter-field"><span>Fecha desde</span><input type="date" value={filters.fechaDesde} onChange={(event) => setFilters({ ...filters, fechaDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha hasta</span><input type="date" value={filters.fechaHasta} onChange={(event) => setFilters({ ...filters, fechaHasta: event.target.value })} /></label>
          <label className="filter-field">
            <span>Tipo sanitario</span>
            <select value={filters.tipo} onChange={(event) => setFilters({ ...filters, tipo: event.target.value as VaccinationFilters['tipo'] })}>
              <option value="">Todos</option>
              {tipoSanitarioOptions.map((tipo) => <option key={tipo} value={tipo}>{formatTipoSanitario(tipo)}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Estado</span>
            <select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value as VaccinationFilters['estado'] })}>
              <option value="">Todos</option>
              {estadoOptions.map((estado) => <option key={estado} value={estado}>{formatEstado(estado)}</option>)}
            </select>
          </label>
          <button type="submit" className="secondary-button">Filtrar</button>
        </form>
        <div className="table-wrap">
          <table className="users-table">
            <thead><tr><th>Fecha programada</th><th>Fecha realizada</th><th>Tipo sanitario</th><th>Estado</th><th>Alcance</th><th>Animales</th><th>Usuario</th><th>Observaciones</th></tr></thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.fechaProgramada)}</td>
                  <td>{formatDate(item.fechaRealizada)}</td>
                  <td>{formatTipoSanitario(item.tipoSanitario)}</td>
                  <td><span className={`status-pill ${statusClass(item.estado)}`}>{formatEstado(item.estado)}</span></td>
                  <td>{alcanceLabel(item)}</td>
                  <td>{item.cantidadAnimales}</td>
                  <td>{item.usuario?.nombre ?? '-'}</td>
                  <td>{item.observaciones || '-'}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={8}>Sin vacunaciones para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
