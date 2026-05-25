import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Clock3, RefreshCcw, Syringe } from 'lucide-react';
import { AgendaTaskActions } from '../components/ui/AgendaTaskActions';
import { ApiError } from '../services/apiClient';
import { getAnimales } from '../services/animalesService';
import { getLotes } from '../services/lotesService';
import {
  getPendingVaccinationTasks,
  getVaccinationEvents,
  scheduleVaccination,
  type ScheduleVaccinationValues,
} from '../services/vacunacionService';
import type { AgendaTarea } from '../types/agenda';
import type { Animal, CategoriaAnimal } from '../types/animales';
import type { AuthUser } from '../types/auth';
import type { Evento } from '../types/eventos';
import type { Lote } from '../types/lotes';

const categoriaOptions: CategoriaAnimal[] = ['TERNERA', 'VAQUILLONA', 'VACA', 'TORO'];
type ScheduleMode = 'individual' | 'lote' | 'categoria' | 'lote_categoria';

const scheduleModes: Array<{ value: ScheduleMode; label: string; helper: string }> = [
  { value: 'individual', label: 'Animales individuales', helper: 'Buscar y seleccionar animales activos puntuales.' },
  { value: 'lote', label: 'Lote completo', helper: 'Se programara para todos los animales activos del lote seleccionado.' },
  { value: 'categoria', label: 'Categoria', helper: 'Se programara para todos los animales activos de la categoria seleccionada.' },
  { value: 'lote_categoria', label: 'Lote + categoria', helper: 'Se programara para todos los animales activos que coincidan con el lote y la categoria.' },
];

const emptyScheduleForm: ScheduleVaccinationValues = {
  fechaProgramada: '',
  descripcion: '',
  animalIds: [],
  loteId: '',
  categoria: '',
};

interface VaccinationPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function VaccinationPage({ authToken, currentUser, onUnauthorized }: VaccinationPageProps) {
  const [tasks, setTasks] = useState<AgendaTarea[]>([]);
  const [events, setEvents] = useState<Evento[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [formValues, setFormValues] = useState<ScheduleVaccinationValues>(emptyScheduleForm);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('individual');
  const [animalSearch, setAnimalSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const todayEnd = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  const vencidas = tasks.filter((task) => new Date(task.fechaProgramada) < todayStart).length;
  const programadas = tasks.filter((task) => new Date(task.fechaProgramada) > todayEnd).length;
  const activeAnimals = useMemo(
    () => animals.filter((animal) => animal.activo && animal.estadoAnimal === 'ACTIVO'),
    [animals],
  );
  const filteredAnimals = useMemo(() => {
    const query = animalSearch.trim().toLowerCase();
    if (query.length < 2) return [];

    return activeAnimals
      .filter((animal) =>
        animal.caravana.toLowerCase().includes(query) ||
        (animal.nombre ?? '').toLowerCase().includes(query),
      )
      .slice(0, 20);
  }, [activeAnimals, animalSearch]);
  const selectedAnimals = useMemo(
    () => activeAnimals.filter((animal) => formValues.animalIds.includes(animal.id)),
    [activeAnimals, formValues.animalIds],
  );
  const matchingActiveAnimalsCount = useMemo(() => {
    if (scheduleMode === 'individual') return selectedAnimals.length;
    if (scheduleMode === 'lote' && !formValues.loteId) return 0;
    if (scheduleMode === 'categoria' && !formValues.categoria) return 0;
    if (scheduleMode === 'lote_categoria' && (!formValues.loteId || !formValues.categoria)) return 0;

    return activeAnimals.filter((animal) => {
      if (scheduleMode === 'lote') return formValues.loteId && String(animal.loteId) === formValues.loteId;
      if (scheduleMode === 'categoria') return formValues.categoria && animal.categoria === formValues.categoria;
      return (
        formValues.loteId &&
        formValues.categoria &&
        String(animal.loteId) === formValues.loteId &&
        animal.categoria === formValues.categoria
      );
    }).length;
  }, [activeAnimals, formValues.categoria, formValues.loteId, scheduleMode, selectedAnimals.length]);
  const selectedMode = scheduleModes.find((mode) => mode.value === scheduleMode)!;
  const shouldSearchAnimals = animalSearch.trim().length >= 2;
  const isScheduleSelectionValid =
    scheduleMode === 'individual'
      ? selectedAnimals.length > 0
      : matchingActiveAnimalsCount > 0;
  const canSubmitSchedule =
    Boolean(formValues.fechaProgramada) &&
    Boolean(formValues.descripcion.trim()) &&
    isScheduleSelectionValid &&
    !isSaving;

  async function loadData() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      const [nextTasks, nextEvents, nextAnimals, nextLotes] = await Promise.all([
        getPendingVaccinationTasks(authToken),
        getVaccinationEvents(authToken),
        getAnimales(authToken, { caravana: '', loteId: '', estadoReproductivo: '', estadoAnimal: '', activo: 'true' }),
        getLotes(authToken),
      ]);

      setTasks(nextTasks);
      setEvents(nextEvents);
      setAnimals(nextAnimals);
      setLotes(nextLotes);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar vacunacion.');
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
      animalIds: exists
        ? formValues.animalIds.filter((id) => id !== animalId)
        : [...formValues.animalIds, animalId],
    });
  }

  function changeScheduleMode(nextMode: ScheduleMode) {
    setScheduleMode(nextMode);
    setAnimalSearch('');
    setFormValues({
      ...formValues,
      animalIds: [],
      loteId: '',
      categoria: '',
    });
    setError('');
  }

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!formValues.fechaProgramada) {
        throw new Error('Selecciona una fecha programada.');
      }
      if (!formValues.descripcion.trim()) {
        throw new Error('Ingresa el nombre de la vacuna o campana.');
      }
      if (!isScheduleSelectionValid) {
        throw new Error('No hay animales activos para la seleccion indicada.');
      }

      const payload: ScheduleVaccinationValues = {
        fechaProgramada: formValues.fechaProgramada,
        descripcion: formValues.descripcion,
        animalIds: scheduleMode === 'individual' ? formValues.animalIds : [],
        loteId: scheduleMode === 'lote' || scheduleMode === 'lote_categoria' ? formValues.loteId : '',
        categoria: scheduleMode === 'categoria' || scheduleMode === 'lote_categoria' ? formValues.categoria : '',
      };
      const result = await scheduleVaccination(authToken, payload);
      setFormValues(emptyScheduleForm);
      setAnimalSearch('');
      setSuccess(`Vacunacion programada: ${result.tareasCreadas} tareas creadas.`);
      await loadData();
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setError(saveError instanceof Error ? saveError.message : 'No se pudo programar la vacunacion.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Control de Vacunacion</h2>
          <p>Programacion, seguimiento e historial sanitario.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar vacunacion">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="operative-summary-grid">
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-emerald"><Syringe size={20} /></div>
          <p className="metric-title">Pendientes</p>
          <strong className="metric-value">{tasks.length}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-rose"><Clock3 size={20} /></div>
          <p className="metric-title">Vencidas</p>
          <strong className="metric-value">{vencidas}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-blue"><CheckCircle2 size={20} /></div>
          <p className="metric-title">Realizadas</p>
          <strong className="metric-value">{events.length}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-indigo"><CalendarClock size={20} /></div>
          <p className="metric-title">Programadas</p>
          <strong className="metric-value">{programadas}</strong>
        </article>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Programar vacunacion</h2>
            <p>Crear tareas VACUNACION para animales activos.</p>
          </div>
        </div>

        <form className="user-form vaccination-form" onSubmit={handleScheduleSubmit}>
          <div className="vaccination-mode-selector">
            {scheduleModes.map((mode) => (
              <button
                type="button"
                key={mode.value}
                className={scheduleMode === mode.value ? 'vaccination-mode-active' : ''}
                onClick={() => changeScheduleMode(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <label>
            <span>Fecha programada</span>
            <input
              type="date"
              value={formValues.fechaProgramada}
              onChange={(event) => setFormValues({ ...formValues, fechaProgramada: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Vacuna / campana</span>
            <input
              value={formValues.descripcion}
              onChange={(event) => setFormValues({ ...formValues, descripcion: event.target.value })}
              placeholder="Ej. Aftosa campana primavera"
              required
            />
          </label>

          <div className="vaccination-selection-panel">
            {scheduleMode !== 'individual' && <p className="selection-helper">{selectedMode.helper}</p>}

            {(scheduleMode === 'lote' || scheduleMode === 'lote_categoria') && (
              <label>
                <span>Lote</span>
                <select
                  value={formValues.loteId}
                  onChange={(event) => setFormValues({ ...formValues, loteId: event.target.value })}
                  required
                >
                  <option value="">Seleccionar lote</option>
                  {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
                </select>
              </label>
            )}

            {(scheduleMode === 'categoria' || scheduleMode === 'lote_categoria') && (
              <label>
                <span>Categoria</span>
                <select
                  value={formValues.categoria}
                  onChange={(event) => setFormValues({ ...formValues, categoria: event.target.value })}
                  required
                >
                  <option value="">Seleccionar categoria</option>
                  {categoriaOptions.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
                </select>
              </label>
            )}

            {scheduleMode === 'individual' && (
              <div className="animal-selector">
                <label>
                  <span>Buscar animal activo</span>
                  <input
                    value={animalSearch}
                    onChange={(event) => setAnimalSearch(event.target.value)}
                    placeholder="Ingrese caravana o nombre"
                  />
                </label>
                <p className="field-help">Escribi al menos 2 caracteres para buscar animales activos.</p>

                {shouldSearchAnimals && (
                  <div>
                    {filteredAnimals.map((animal) => (
                      <label key={animal.id} className="checkbox-row animal-selector-option">
                        <input
                          type="checkbox"
                          checked={formValues.animalIds.includes(animal.id)}
                          onChange={() => toggleAnimalSelection(animal.id)}
                        />
                        <span>#{animal.caravana} {animal.nombre ? `- ${animal.nombre}` : ''}</span>
                      </label>
                    ))}
                    {filteredAnimals.length === 0 && (
                      <p className="table-empty">No se encontraron animales activos con ese criterio.</p>
                    )}
                  </div>
                )}

                {selectedAnimals.length > 0 && (
                  <div className="selected-animals-summary">
                    {selectedAnimals.map((animal) => (
                      <button type="button" key={animal.id} onClick={() => toggleAnimalSelection(animal.id)}>
                        #{animal.caravana} x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(scheduleMode !== 'individual' || selectedAnimals.length > 0) && (
              <div className={`selection-count ${matchingActiveAnimalsCount > 0 ? 'selection-count-ok' : 'selection-count-empty'}`}>
                {matchingActiveAnimalsCount > 0
                  ? `${matchingActiveAnimalsCount} animales activos incluidos.`
                  : 'No hay animales activos para la seleccion actual.'}
              </div>
            )}
          </div>

          <button type="submit" className="primary-button vaccination-submit" disabled={!canSubmitSchedule}>
            <Syringe size={18} />
            {isSaving ? 'Programando...' : 'Programar vacunacion'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Vacunaciones pendientes</h2>
            <p>{tasks.length} tareas pendientes.</p>
          </div>
        </div>

        {isLoading ? <p className="table-empty">Cargando vacunaciones...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Animal</th>
                  <th>Lote</th>
                  <th>Categoria</th>
                  <th>Descripcion</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{formatDate(task.fechaProgramada)}</td>
                    <td>
                      <Link className="table-link" to={`/rodeos/${task.animal.id}`}>#{task.animal.caravana}</Link>
                    </td>
                    <td>{task.animal.lote.nombre}</td>
                    <td>{task.animal.categoria}</td>
                    <td>{task.descripcion || '-'}</td>
                    <td><span className="status-pill status-active">{task.estado}</span></td>
                    <td>
                      <AgendaTaskActions
                        authToken={authToken}
                        currentUser={currentUser}
                        task={task}
                        onChanged={() => void loadData()}
                        onUnauthorized={onUnauthorized}
                      />
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td colSpan={7}>Sin vacunaciones pendientes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historial de vacunaciones</h2>
            <p>{events.length} eventos registrados.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Animal</th>
                <th>Lote</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evento) => (
                <tr key={evento.id}>
                  <td>{formatDateTime(evento.fecha)}</td>
                  <td>
                    <Link className="table-link" to={`/rodeos/${evento.animal.id}`}>#{evento.animal.caravana}</Link>
                  </td>
                  <td>{evento.animal.lote?.nombre ?? '-'}</td>
                  <td>{evento.observaciones || '-'}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={4}>Sin vacunaciones registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
