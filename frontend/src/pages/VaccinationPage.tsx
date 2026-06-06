import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Clock3, FilterX, ListChecks, RefreshCcw, Syringe, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getAnimales } from '../services/animalesService';
import { getLotes } from '../services/lotesService';
import { getReglasSanitarias, type ReglaSanitaria } from '../services/reglasSanitariasService';
import {
  getVaccinationHistory,
  getVaccinationSummary,
  performVaccinationsBulk,
  scheduleVaccination,
  type EstadoSanitario,
  type ScheduleVaccinationValues,
  type VaccinationFilters,
  type VaccinationHistoryItem,
  type VaccinationSummary,
} from '../services/vacunacionService';
import type { Animal, CategoriaAnimal } from '../types/animales';
import type { AuthUser } from '../types/auth';
import type { Lote } from '../types/lotes';

const categoriaOptions: CategoriaAnimal[] = ['GUACHERA', 'ESCUELITA', 'TERNERA', 'VAQUILLONA', 'VACA_PRODUCCION', 'VACA_SECA', 'PREPARTO', 'TORO'];
const estadoOptions: EstadoSanitario[] = ['PROGRAMADA', 'PENDIENTE', 'REALIZADA', 'VENCIDA'];
type ScheduleMode = 'individual' | 'lote' | 'categoria';

const scheduleModes: Array<{ value: ScheduleMode; label: string; helper: string }> = [
  { value: 'individual', label: 'Animales individuales', helper: 'Buscar y seleccionar animales activos puntuales.' },
  { value: 'lote', label: 'Lote completo', helper: 'Se programará para todos los animales activos del lote seleccionado.' },
  { value: 'categoria', label: 'Categoría', helper: 'Se programará para todos los animales activos de la categoría seleccionada.' },
];

const emptyScheduleForm: ScheduleVaccinationValues = {
  fechaProgramada: '',
  fechaObjetivo: '',
  tipoSanitario: '',
  descripcion: '',
  animalIds: [],
  loteId: '',
  categoria: '',
};

const emptyFilters: VaccinationFilters = {
  estado: '',
  tipo: '',
  fechaProgramadaDesde: '',
  fechaProgramadaHasta: '',
  fechaObjetivoDesde: '',
  fechaObjetivoHasta: '',
  fechaRealizadaDesde: '',
  fechaRealizadaHasta: '',
  loteId: '',
  categoria: '',
};

const emptyPendingFilters = {
  loteId: '',
  categoria: '',
  tipo: '',
};

const todayIso = () => new Date().toISOString().slice(0, 10);

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
  return labels[value] ?? value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
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
  if (!value) return '-';
  const labels: Record<CategoriaAnimal, string> = {
    GUACHERA: 'Guachera',
    ESCUELITA: 'Escuelita',
    TERNERA: 'Ternera',
    VAQUILLONA: 'Vaquillona',
    VACA_PRODUCCION: 'Vaca Producción',
    VACA_SECA: 'Vaca Seca',
    PREPARTO: 'Preparto',
    TORO: 'Toro',
    BAJA: 'Baja',
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}

function statusClass(estado: EstadoSanitario) {
  if (estado === 'REALIZADA') return 'status-active';
  if (estado === 'VENCIDA') return 'status-inactive';
  if (estado === 'PROGRAMADA') return 'status-warning';
  return 'status-active';
}

function animalLink(animal: VaccinationHistoryItem['animal']) {
  return (
    <Link className="table-link" to={`/rodeos/${animal.id}`} state={{ from: '/vacunacion', label: 'Volver a Vacunación' }}>
      #{animal.caravana}
    </Link>
  );
}

export function VaccinationPage({ authToken, onUnauthorized }: VaccinationPageProps) {
  const [pendingHistory, setPendingHistory] = useState<VaccinationHistoryItem[]>([]);
  const [history, setHistory] = useState<VaccinationHistoryItem[]>([]);
  const [summary, setSummary] = useState<VaccinationSummary>({ pendientes: 0, vencidas: 0, realizadas: 0, programadas: 0, todas: 0 });
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [reglas, setReglas] = useState<ReglaSanitaria[]>([]);
  const [filters, setFilters] = useState<VaccinationFilters>(emptyFilters);
  const [pendingFilters, setPendingFilters] = useState(emptyPendingFilters);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [formValues, setFormValues] = useState<ScheduleVaccinationValues>(emptyScheduleForm);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('individual');
  const [animalSearch, setAnimalSearch] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState({ fechaRealizada: todayIso(), observaciones: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeAnimals = useMemo(() => animals.filter((animal) => animal.activo && animal.estadoAnimal === 'ACTIVO'), [animals]);
  const activeSanitaryRules = useMemo(() => reglas.filter((regla) => regla.activo), [reglas]);
  const filteredAnimals = useMemo(() => {
    const query = animalSearch.trim().toLowerCase();
    if (query.length < 2) return [];
    return activeAnimals
      .filter((animal) => animal.caravana.toLowerCase().includes(query) || (animal.nombre ?? '').toLowerCase().includes(query))
      .slice(0, 20);
  }, [activeAnimals, animalSearch]);
  const selectedAnimals = useMemo(() => activeAnimals.filter((animal) => formValues.animalIds.includes(animal.id)), [activeAnimals, formValues.animalIds]);
  const pendingCategories = useMemo(
    () => Array.from(new Set(pendingHistory.map((item) => item.animal.categoriaAnimal))).sort(),
    [pendingHistory],
  );
  const historyCategories = useMemo(
    () => Array.from(new Set(animals.map((animal) => animal.categoriaAnimal))).sort(),
    [animals],
  );
  const visiblePendingHistory = useMemo(() => pendingHistory.filter((item) => {
    if (pendingFilters.loteId && String(item.animal.lote.id) !== pendingFilters.loteId) return false;
    if (pendingFilters.categoria && item.animal.categoriaAnimal !== pendingFilters.categoria) return false;
    if (pendingFilters.tipo && item.tipoSanitario !== pendingFilters.tipo) return false;
    return true;
  }), [pendingFilters, pendingHistory]);
  const visibleTaskIds = useMemo(
    () => visiblePendingHistory.flatMap((item) => item.tareaIds),
    [visiblePendingHistory],
  );
  const selectedVisibleCount = visibleTaskIds.filter((id) => selectedTaskIds.includes(id)).length;
  const allVisibleSelected = visibleTaskIds.length > 0 && selectedVisibleCount === visibleTaskIds.length;
  const selectedPendingItems = useMemo(
    () => pendingHistory.filter((item) => item.tareaIds.some((id) => selectedTaskIds.includes(id))),
    [pendingHistory, selectedTaskIds],
  );
  const bulkModalSummary = useMemo(() => {
    const lotesById = new Map(selectedPendingItems.map((item) => [item.animal.lote.id, item.animal.lote.nombre]));
    const categorias = Array.from(new Set(selectedPendingItems.map((item) => item.animal.categoriaAnimal)));
    const tiposSanitarios = Array.from(new Set(selectedPendingItems.map((item) => item.tipoSanitario)));
    const tipoSanitarioNames = tiposSanitarios.map((tipoSanitario) => activeSanitaryRules.find((regla) => regla.codigo === tipoSanitario)?.nombre ?? formatTipoSanitario(tipoSanitario));

    const loteLabel = lotesById.size === 1 ? Array.from(lotesById.values())[0] : lotesById.size > 1 ? 'Varios lotes' : '-';
    const categoriaLabel = categorias.length === 1 ? formatCategoria(categorias[0]) : categorias.length > 1 ? 'Varias categorías' : '-';
    const tipoSanitarioLabel = tipoSanitarioNames.length === 1 ? tipoSanitarioNames[0] : tipoSanitarioNames.length > 1 ? 'Varios tipos sanitarios' : '-';

    const count = selectedPendingItems.length;
    const firstItem = selectedPendingItems[0];
    const tipoSanitarioText = tipoSanitarioNames.length === 1 ? ` de ${tipoSanitarioNames[0]}` : '';

    let confirmationMessage = `Se registrarán como realizadas ${count} vacunaciones.`;
    if (count === 1 && firstItem) {
      confirmationMessage = `Se registrará como realizada 1 vacunación de ${tipoSanitarioLabel} para el animal #${firstItem.animal.caravana}, lote ${firstItem.animal.lote.nombre}, categoría ${formatCategoria(firstItem.animal.categoriaAnimal)}.`;
    } else if (count > 1 && lotesById.size === 1) {
      confirmationMessage = `Se registrarán como realizadas ${count} vacunaciones${tipoSanitarioText} del lote ${loteLabel}.`;
    } else if (count > 1 && lotesById.size > 1) {
      confirmationMessage = `Se registrarán como realizadas ${count} vacunaciones${tipoSanitarioText} correspondientes a varios lotes.`;
    }

    return { loteLabel, categoriaLabel, tipoSanitarioLabel, confirmationMessage };
  }, [activeSanitaryRules, selectedPendingItems]);
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
      const [nextTasks, nextHistory, nextSummary, nextAnimals, nextLotes, nextReglas] = await Promise.all([
        getVaccinationHistory(authToken, { estado: 'PENDIENTE' }),
        getVaccinationHistory(authToken, nextFilters),
        getVaccinationSummary(authToken),
        getAnimales(authToken, { caravana: '', categoriaAnimal: '', loteId: '', estadoReproductivo: '', estadoAnimal: '', activo: 'true' }),
        getLotes(authToken),
        getReglasSanitarias(authToken),
      ]);
      setPendingHistory(nextTasks.registros);
      setHistory(nextHistory.registros);
      setSummary(nextSummary);
      setAnimals(nextAnimals);
      setLotes(nextLotes);
      setReglas(nextReglas);
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

  useEffect(() => {
    setSelectedTaskIds((current) => current.filter((id) => visibleTaskIds.includes(id)));
  }, [visibleTaskIds]);

  function toggleAnimalSelection(animalId: number) {
    const exists = formValues.animalIds.includes(animalId);
    setFormValues({
      ...formValues,
      animalIds: exists ? formValues.animalIds.filter((id) => id !== animalId) : [...formValues.animalIds, animalId],
    });
  }

  function togglePendingSelection(taskId: number) {
    const exists = selectedTaskIds.includes(taskId);
    setSelectedTaskIds(exists ? selectedTaskIds.filter((id) => id !== taskId) : [...selectedTaskIds, taskId]);
  }

  function toggleAllVisiblePending(checked: boolean) {
    setSelectedTaskIds((current) => {
      const withoutVisible = current.filter((id) => !visibleTaskIds.includes(id));
      return checked ? [...withoutVisible, ...visibleTaskIds] : withoutVisible;
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
        fechaObjetivo: formValues.fechaObjetivo || formValues.fechaProgramada,
        tipoSanitario: formValues.tipoSanitario,
        descripcion: formValues.descripcion,
        animalIds: scheduleMode === 'individual' ? formValues.animalIds : [],
        loteId: scheduleMode === 'lote' ? formValues.loteId : '',
        categoria: scheduleMode === 'categoria' ? formValues.categoria : '',
      };
      const result = await scheduleVaccination(authToken, payload);
      setFormValues(emptyScheduleForm);
      setAnimalSearch('');
      setSuccess(`Vacunación programada: ${result.tareasCreadas} tareas individuales creadas.`);
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo programar la vacunación.');
    } finally {
      setIsSaving(false);
    }
  }

  function openBulkModal() {
    setBulkValues({ fechaRealizada: todayIso(), observaciones: '' });
    setIsBulkModalOpen(true);
    setError('');
    setSuccess('');
  }

  function closeBulkModal() {
    setIsBulkModalOpen(false);
    setBulkValues({ fechaRealizada: todayIso(), observaciones: '' });
  }

  async function handleBulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await performVaccinationsBulk(authToken, {
        vacunacionIds: selectedTaskIds,
        fechaRealizada: bulkValues.fechaRealizada,
        observaciones: bulkValues.observaciones,
      });
      setSuccess(`${result.tareasActualizadas} vacunaciones registradas como realizadas.`);
      setSelectedTaskIds([]);
      closeBulkModal();
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudieron registrar las vacunaciones seleccionadas.');
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
        <button type="button" className="metric-card operative-card vaccination-summary-card" onClick={() => applyStatusFilter('')}>
          <div className="metric-icon metric-icon-blue"><ListChecks size={20} /></div><p className="metric-title">Todas</p><strong className="metric-value">{summary.todas}</strong>
        </button>
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
        <div className="panel-header"><div><h2>Vacunas pendientes</h2><p>{visiblePendingHistory.length} tareas sanitarias visibles.</p></div></div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field">
            <span>Lote</span>
            <select value={pendingFilters.loteId} onChange={(event) => setPendingFilters({ ...pendingFilters, loteId: event.target.value })}>
              <option value="">Todos</option>
              {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Categoría</span>
            <select value={pendingFilters.categoria} onChange={(event) => setPendingFilters({ ...pendingFilters, categoria: event.target.value })}>
              <option value="">Todas</option>
              {pendingCategories.map((categoria) => <option key={categoria} value={categoria}>{formatCategoria(categoria)}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Tipo sanitario</span>
            <select value={pendingFilters.tipo} onChange={(event) => setPendingFilters({ ...pendingFilters, tipo: event.target.value })}>
              <option value="">Todos</option>
              {activeSanitaryRules.map((regla) => <option key={regla.id} value={regla.codigo}>{regla.nombre}</option>)}
            </select>
          </label>
        </form>
        {isLoading ? <p className="table-empty">Cargando vacunaciones...</p> : (
          <>
            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>
                      <label className="checkbox-row">
                        <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisiblePending(event.target.checked)} disabled={visibleTaskIds.length === 0} />
                        <span>Seleccionar</span>
                      </label>
                    </th>
                    <th>Fecha programada</th>
                    <th>Fecha objetivo</th>
                    <th>Animal / Caravana</th>
                    <th>Categoría</th>
                    <th>Lote</th>
                    <th>Tipo sanitario</th>
                    <th>Estado</th>
                    <th>Usuario</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePendingHistory.map((item) => {
                    const taskId = item.tareaIds[0];
                    return (
                      <tr key={item.id}>
                        <td>
                          <label className="checkbox-row">
                            <input type="checkbox" checked={selectedTaskIds.includes(taskId)} onChange={() => togglePendingSelection(taskId)} />
                            <span>#{item.animal.caravana}</span>
                          </label>
                        </td>
                        <td>{formatDate(item.fechaProgramada)}</td>
                        <td>{formatDate(item.fechaObjetivo)}</td>
                        <td>{animalLink(item.animal)}</td>
                        <td>{formatCategoria(item.animal.categoriaAnimal)}</td>
                        <td>{item.animal.lote.nombre}</td>
                        <td>{formatTipoSanitario(item.tipoSanitario)}</td>
                        <td><span className="status-pill status-active">{formatEstado(item.estado)}</span></td>
                        <td>{item.usuario?.nombre ?? '-'}</td>
                        <td>{item.observaciones || '-'}</td>
                      </tr>
                    );
                  })}
                  {visiblePendingHistory.length === 0 && <tr><td colSpan={10}>Sin vacunaciones pendientes para los filtros seleccionados.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button type="button" className="primary-button" onClick={openBulkModal} disabled={selectedTaskIds.length === 0}>
                <CheckCircle2 size={18} />
                Registrar seleccionadas como realizadas
              </button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Programar vacunación</h2><p>Crear campañas extraordinarias o controles especiales.</p></div></div>
        <form className="user-form vaccination-form" onSubmit={handleScheduleSubmit}>
          <div className="vaccination-mode-selector">
            {scheduleModes.map((mode) => (
              <button type="button" key={mode.value} className={scheduleMode === mode.value ? 'vaccination-mode-active' : ''} onClick={() => changeScheduleMode(mode.value)}>
                {mode.label}
              </button>
            ))}
          </div>
          <label><span>Fecha programada</span><input type="date" value={formValues.fechaProgramada} onChange={(event) => setFormValues({ ...formValues, fechaProgramada: event.target.value })} required /></label>
          <label><span>Fecha objetivo</span><input type="date" value={formValues.fechaObjetivo} onChange={(event) => setFormValues({ ...formValues, fechaObjetivo: event.target.value })} /></label>
          <label>
            <span>Tipo sanitario</span>
            <select value={formValues.tipoSanitario} onChange={(event) => setFormValues({ ...formValues, tipoSanitario: event.target.value })} required>
              <option value="">Seleccionar tipo</option>
              {activeSanitaryRules.map((regla) => <option key={regla.id} value={regla.codigo}>{regla.nombre}</option>)}
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
        <div className="panel-header">
          <div><h2>Historial sanitario</h2><p>{history.length} registros encontrados.</p></div>
          <button type="button" className="secondary-button" onClick={() => applyStatusFilter('')}><FilterX size={16} />Todas</button>
        </div>
        <form className="filters-form events-filters production-filters" onSubmit={handleFilters}>
          <label className="filter-field"><span>Fecha programada desde</span><input type="date" value={filters.fechaProgramadaDesde} onChange={(event) => setFilters({ ...filters, fechaProgramadaDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha programada hasta</span><input type="date" value={filters.fechaProgramadaHasta} onChange={(event) => setFilters({ ...filters, fechaProgramadaHasta: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha objetivo desde</span><input type="date" value={filters.fechaObjetivoDesde} onChange={(event) => setFilters({ ...filters, fechaObjetivoDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha objetivo hasta</span><input type="date" value={filters.fechaObjetivoHasta} onChange={(event) => setFilters({ ...filters, fechaObjetivoHasta: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha realizada desde</span><input type="date" value={filters.fechaRealizadaDesde} onChange={(event) => setFilters({ ...filters, fechaRealizadaDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha realizada hasta</span><input type="date" value={filters.fechaRealizadaHasta} onChange={(event) => setFilters({ ...filters, fechaRealizadaHasta: event.target.value })} /></label>
          <label className="filter-field">
            <span>Lote</span>
            <select value={filters.loteId} onChange={(event) => setFilters({ ...filters, loteId: event.target.value })}>
              <option value="">Todos</option>
              {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Categoría</span>
            <select value={filters.categoria} onChange={(event) => setFilters({ ...filters, categoria: event.target.value as VaccinationFilters['categoria'] })}>
              <option value="">Todas</option>
              {historyCategories.map((categoria) => <option key={categoria} value={categoria}>{formatCategoria(categoria)}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Tipo sanitario</span>
            <select value={filters.tipo} onChange={(event) => setFilters({ ...filters, tipo: event.target.value })}>
              <option value="">Todos</option>
              {activeSanitaryRules.map((regla) => <option key={regla.id} value={regla.codigo}>{regla.nombre}</option>)}
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
            <thead><tr><th>Fecha programada</th><th>Fecha objetivo</th><th>Fecha realizada</th><th>Animal / Caravana</th><th>Categoría</th><th>Lote</th><th>Tipo sanitario</th><th>Estado</th><th>Usuario</th><th>Observaciones</th></tr></thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.fechaProgramada)}</td>
                  <td>{formatDate(item.fechaObjetivo)}</td>
                  <td>{formatDate(item.fechaRealizada)}</td>
                  <td>{animalLink(item.animal)}</td>
                  <td>{formatCategoria(item.animal.categoriaAnimal)}</td>
                  <td>{item.animal.lote.nombre}</td>
                  <td>{formatTipoSanitario(item.tipoSanitario)}</td>
                  <td><span className={`status-pill ${statusClass(item.estado)}`}>{formatEstado(item.estado)}</span></td>
                  <td>{item.usuario?.nombre ?? '-'}</td>
                  <td>{item.observaciones || '-'}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={10}>Sin vacunaciones para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {isBulkModalOpen && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <div className="panel-header">
              <div>
                <h2>Registrar vacunaciones realizadas</h2>
                <p>{selectedTaskIds.length} vacunaciones seleccionadas</p>
              </div>
              <button type="button" className="icon-button" onClick={closeBulkModal} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>
            <form className="user-form" onSubmit={handleBulkSubmit}>
              <div className="info-grid">
                <div className="info-item"><span>Cantidad</span><strong>{selectedPendingItems.length}</strong></div>
                <div className="info-item"><span>Lote</span><strong>{bulkModalSummary.loteLabel}</strong></div>
                <div className="info-item"><span>Categoría</span><strong>{bulkModalSummary.categoriaLabel}</strong></div>
                <div className="info-item"><span>Tipo sanitario</span><strong>{bulkModalSummary.tipoSanitarioLabel}</strong></div>
              </div>
              <div className="form-warning">
                {bulkModalSummary.confirmationMessage}
              </div>
              <label><span>Fecha realizada</span><input type="date" value={bulkValues.fechaRealizada} onChange={(event) => setBulkValues({ ...bulkValues, fechaRealizada: event.target.value })} required /></label>
              <label><span>Observaciones</span><textarea rows={4} value={bulkValues.observaciones} onChange={(event) => setBulkValues({ ...bulkValues, observaciones: event.target.value })} /></label>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeBulkModal} disabled={isSaving}>Volver</button>
                <button type="submit" className="primary-button" disabled={isSaving}><CheckCircle2 size={18} />{isSaving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
