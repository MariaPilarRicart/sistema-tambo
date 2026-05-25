import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Edit2, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { createAnimal, deactivateAnimal, getAnimales, updateAnimal } from '../services/animalesService';
import { createEvento } from '../services/eventosService';
import { getLotes } from '../services/lotesService';
import type {
  Animal,
  AnimalDeactivateValues,
  AnimalFilters,
  AnimalFormValues,
  CategoriaAnimal,
  EstadoAnimal,
  EstadoReproductivo,
  MotivoBajaAnimal,
} from '../types/animales';
import type { AuthUser } from '../types/auth';
import type { EventoFormValues, TipoEvento } from '../types/eventos';
import type { Lote } from '../types/lotes';

const categoriaOptions: CategoriaAnimal[] = ['TERNERA', 'VAQUILLONA', 'VACA', 'TORO'];
const estadoReproductivoOptions: EstadoReproductivo[] = [
  'NO_APLICA',
  'VACIA',
  'INSEMINADA',
  'PRENADA',
  'SECA',
  'RECUPERACION',
];
const estadoAnimalOptions: EstadoAnimal[] = ['ACTIVO', 'VENDIDO', 'MUERTO', 'ROBADO', 'TRASLADADO', 'OTRO'];
const motivoBajaOptions: Array<{ value: MotivoBajaAnimal; label: string }> = [
  { value: 'VENDIDO', label: 'Vendido' },
  { value: 'MUERTO', label: 'Muerto' },
  { value: 'ROBADO', label: 'Robado / extraviado' },
  { value: 'TRASLADADO', label: 'Trasladado' },
  { value: 'OTRO', label: 'Otro' },
];
const tipoEventoOptions: TipoEvento[] = [
  'CELO',
  'INSEMINACION',
  'TACTO',
  'SECADO',
  'PARTO',
  'ABORTO',
  'CLINICO',
  'VACUNACION',
  'CAMBIO_LOTE',
  'VENTA',
  'MUERTE',
];

const emptyFilters: AnimalFilters = {
  caravana: '',
  loteId: '',
  estadoReproductivo: '',
  estadoAnimal: '',
  activo: '',
};

const emptyAnimalForm: AnimalFormValues = {
  caravana: '',
  nombre: '',
  fechaNacimiento: '',
  raza: '',
  categoria: 'VACA',
  estadoReproductivo: 'VACIA',
  estadoAnimal: 'ACTIVO',
  activo: true,
  loteId: '',
  madreId: '',
  padreNombre: '',
};

const emptyEventoForm: EventoFormValues = {
  tipo: 'CELO',
  observaciones: '',
  resultadoTacto: 'POSITIVO',
};

const emptyDeactivateForm: AnimalDeactivateValues = {
  estadoAnimal: 'VENDIDO',
  observacionesBaja: '',
};

interface HerdPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function HerdPage({ authToken, currentUser, onUnauthorized }: HerdPageProps) {
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [allAnimales, setAllAnimales] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [filters, setFilters] = useState<AnimalFilters>(emptyFilters);
  const [formValues, setFormValues] = useState<AnimalFormValues>(emptyAnimalForm);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [eventAnimal, setEventAnimal] = useState<Animal | null>(null);
  const [eventFormValues, setEventFormValues] = useState<EventoFormValues>(emptyEventoForm);
  const [deactivateAnimalTarget, setDeactivateAnimalTarget] = useState<Animal | null>(null);
  const [deactivateFormValues, setDeactivateFormValues] = useState<AnimalDeactivateValues>(emptyDeactivateForm);
  const [pendingEventConfirmation, setPendingEventConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const activeLotes = useMemo(() => lotes.filter((lote) => lote.activo), [lotes]);

  function handleRequestError(requestError: unknown) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }

    setError(requestError instanceof Error ? requestError.message : 'No se pudo completar la operacion.');
  }

  async function loadData(nextFilters = filters) {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      const [nextAnimales, nextLotes] = await Promise.all([
        getAnimales(authToken, nextFilters),
        getLotes(authToken),
      ]);
      const nextAllAnimales = nextFilters === emptyFilters
        ? nextAnimales
        : await getAnimales(authToken, emptyFilters);
      setAnimales(nextAnimales);
      setAllAnimales(nextAllAnimales);
      setLotes(nextLotes);
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  function resetForm() {
    setEditingAnimal(null);
    setFormValues(emptyAnimalForm);
    setError('');
    setSuccess('');
  }

  function startEditing(animal: Animal) {
    setEditingAnimal(animal);
    setFormValues({
      caravana: animal.caravana,
      nombre: animal.nombre ?? '',
      fechaNacimiento: animal.fechaNacimiento.slice(0, 10),
      raza: animal.raza ?? '',
      categoria: animal.categoria,
      estadoReproductivo: animal.estadoReproductivo,
      estadoAnimal: animal.estadoAnimal,
      activo: animal.activo,
      loteId: String(animal.loteId),
      madreId: animal.madreId ? String(animal.madreId) : '',
      padreNombre: animal.padreNombre ?? '',
    });
    setError('');
    setSuccess('');
  }

  function startRegisteringEvent(animal: Animal) {
    setEventAnimal(animal);
    setEventFormValues(emptyEventoForm);
    setError('');
    setSuccess('');
  }

  function closeEventModal() {
    setEventAnimal(null);
    setEventFormValues(emptyEventoForm);
    setPendingEventConfirmation(false);
  }

  function openDeactivateModal(animal: Animal) {
    setDeactivateAnimalTarget(animal);
    setDeactivateFormValues(emptyDeactivateForm);
    setError('');
    setSuccess('');
  }

  function closeDeactivateModal() {
    setDeactivateAnimalTarget(null);
    setDeactivateFormValues(emptyDeactivateForm);
  }

  function getEventConfirmationDetails(values: EventoFormValues) {
    if (values.tipo === 'INSEMINACION') {
      return [
        'El animal pasara a estado INSEMINADA.',
        'Se generara una tarea TACTO pendiente.',
      ];
    }

    if (values.tipo === 'TACTO' && values.resultadoTacto === 'POSITIVO') {
      return [
        'El animal pasara a estado PRENADA.',
        'Se cerrara la tarea TACTO pendiente.',
        'Se crearan tareas SECADO y PARTO.',
      ];
    }

    if (values.tipo === 'TACTO') {
      return [
        'Se cerrara la tarea TACTO pendiente.',
        'El animal pasara a estado VACIA.',
      ];
    }

    if (values.tipo === 'SECADO') {
      return ['El animal pasara a estado SECA.'];
    }

    if (values.tipo === 'PARTO') {
      return [
        'El animal pasara a estado RECUPERACION.',
        'Se creara una tarea ALTA_POST_PARTO.',
      ];
    }

    if (values.tipo === 'ABORTO') {
      return [
        'Se cancelaran tareas pendientes de SECADO y PARTO.',
        'Se creara una tarea TACTO.',
      ];
    }

    if (values.tipo === 'VENTA' || values.tipo === 'MUERTE') {
      return [
        'El animal quedara inactivo.',
        'Se cancelaran sus tareas pendientes.',
        'No se eliminara su historial de eventos, tareas ni genealogia.',
      ];
    }

    return ['Se registrara el evento en el historial del animal.'];
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingAnimal) {
        await updateAnimal(authToken, editingAnimal.id, formValues);
        resetForm();
        setSuccess('Animal actualizado correctamente.');
      } else {
        await createAnimal(authToken, formValues);
        resetForm();
        setSuccess('Animal creado correctamente.');
      }

      await loadData();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (!deactivateAnimalTarget) return;
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      await deactivateAnimal(authToken, deactivateAnimalTarget.id, deactivateFormValues);
      closeDeactivateModal();
      setSuccess('Animal dado de baja correctamente.');
      await loadData();
    } catch (deleteError) {
      handleRequestError(deleteError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (!eventAnimal) return;

    setPendingEventConfirmation(true);
    setError('');
  }

  async function confirmEventRegistration() {
    if (!authToken) return onUnauthorized();
    if (!eventAnimal) return;
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await createEvento(authToken, eventAnimal.id, eventFormValues);
      closeEventModal();
      setSuccess('Evento registrado correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadData(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    void loadData(emptyFilters);
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Gestion del Rodeo</h2>
          <p>Alta, consulta y baja logica de animales.</p>
        </div>
        <div className="settings-summary">
          <strong>{animales.length}</strong>
          <span>animales</span>
        </div>
      </section>

      <section className="panel herd-filters">
        <form className="filters-form" onSubmit={applyFilters}>
          <input
            placeholder="Buscar caravana"
            value={filters.caravana}
            onChange={(event) => setFilters({ ...filters, caravana: event.target.value })}
          />
          <select value={filters.loteId} onChange={(event) => setFilters({ ...filters, loteId: event.target.value })}>
            <option value="">Todos los lotes</option>
            {lotes.map((lote) => (
              <option key={lote.id} value={lote.id}>{lote.nombre}</option>
            ))}
          </select>
          <select value={filters.estadoReproductivo} onChange={(event) => setFilters({ ...filters, estadoReproductivo: event.target.value })}>
            <option value="">Estado reproductivo</option>
            {estadoReproductivoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={filters.estadoAnimal} onChange={(event) => setFilters({ ...filters, estadoAnimal: event.target.value })}>
            <option value="">Estado animal</option>
            {estadoAnimalOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={filters.activo} onChange={(event) => setFilters({ ...filters, activo: event.target.value })}>
            <option value="">Activo/inactivo</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
          <button type="submit" className="secondary-button">Filtrar</button>
          <button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button>
        </form>
      </section>

      <div className="settings-grid">
        {isAdmin && (
          <section className="panel user-form-panel">
            <div className="panel-header">
              <div>
                <h2>{editingAnimal ? 'Editar animal' : 'Nuevo animal'}</h2>
                <p>{editingAnimal ? 'La caravana no se puede modificar.' : 'La caravana debe ser unica.'}</p>
              </div>
              {editingAnimal && (
                <button type="button" className="icon-button" onClick={resetForm} aria-label="Cancelar edicion">
                  <X size={18} />
                </button>
              )}
            </div>

            <form className="user-form" onSubmit={handleSubmit}>
              <label>
                <span>Caravana</span>
                <input value={formValues.caravana} onChange={(event) => setFormValues({ ...formValues, caravana: event.target.value })} required disabled={Boolean(editingAnimal)} />
              </label>
              <label>
                <span>Nombre</span>
                <input value={formValues.nombre} onChange={(event) => setFormValues({ ...formValues, nombre: event.target.value })} />
              </label>
              <label>
                <span>Fecha nacimiento</span>
                <input type="date" value={formValues.fechaNacimiento} onChange={(event) => setFormValues({ ...formValues, fechaNacimiento: event.target.value })} required />
              </label>
              <label>
                <span>Raza</span>
                <input value={formValues.raza} onChange={(event) => setFormValues({ ...formValues, raza: event.target.value })} />
              </label>
              <label>
                <span>Lote</span>
                <select value={formValues.loteId} onChange={(event) => setFormValues({ ...formValues, loteId: event.target.value })} required>
                  <option value="">Seleccionar lote</option>
                  {activeLotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
                </select>
              </label>
              <label>
                <span>Madre</span>
                <select value={formValues.madreId} onChange={(event) => setFormValues({ ...formValues, madreId: event.target.value })}>
                  <option value="">Sin madre registrada</option>
                  {allAnimales
                    .filter((animal) => animal.id !== editingAnimal?.id)
                    .map((animal) => (
                      <option key={animal.id} value={animal.id}>#{animal.caravana} {animal.nombre ? `- ${animal.nombre}` : ''}</option>
                    ))}
                </select>
              </label>
              <label>
                <span>Padre</span>
                <input value={formValues.padreNombre} onChange={(event) => setFormValues({ ...formValues, padreNombre: event.target.value })} placeholder="Nombre externo / toro" />
              </label>
              <label>
                <span>Categoria</span>
                <select value={formValues.categoria} onChange={(event) => setFormValues({ ...formValues, categoria: event.target.value as CategoriaAnimal })}>
                  {categoriaOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label>
                <span>Estado reproductivo</span>
                <select value={formValues.estadoReproductivo} onChange={(event) => setFormValues({ ...formValues, estadoReproductivo: event.target.value as EstadoReproductivo })}>
                  {estadoReproductivoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label>
                <span>Estado animal</span>
                <select value={formValues.estadoAnimal} onChange={(event) => setFormValues({ ...formValues, estadoAnimal: event.target.value as EstadoAnimal })}>
                  {estadoAnimalOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={formValues.activo} onChange={(event) => setFormValues({ ...formValues, activo: event.target.checked })} />
                <span>Animal activo</span>
              </label>

              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}

              <button type="submit" className="primary-button" disabled={isSaving}>
                <Plus size={18} />
                {isSaving ? 'Guardando...' : editingAnimal ? 'Guardar cambios' : 'Crear animal'}
              </button>
            </form>
          </section>
        )}

        <section className="panel users-list-panel">
          <div className="panel-header">
            <div>
              <h2>Animales</h2>
              <p>{isAdmin ? 'Gestion completa del rodeo.' : 'Consulta del rodeo.'}</p>
            </div>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar animales">
              <RefreshCcw size={18} />
            </button>
          </div>

          {isLoading ? <p className="table-empty">Cargando animales...</p> : (
            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Lote</th>
                    <th>Origen</th>
                    <th>Categoria</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {animales.map((animal) => (
                    <tr key={animal.id}>
                      <td><strong>#{animal.caravana}</strong><span>{animal.nombre || animal.raza || 'Sin nombre'}</span></td>
                      <td>{animal.lote.nombre}</td>
                      <td>
                        <strong>{animal.madre ? `#${animal.madre.caravana}` : '-'}</strong>
                        <span>{animal.padreNombre || 'Sin padre'}</span>
                      </td>
                      <td>{animal.categoria}</td>
                      <td>
                        <span className={`status-pill ${animal.activo ? 'status-active' : 'status-inactive'}`}>
                          {animal.estadoAnimal}
                        </span>
                        <span>{animal.estadoReproductivo}</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" onClick={() => startRegisteringEvent(animal)} aria-label={`Registrar evento ${animal.caravana}`}><CalendarPlus size={16} /></button>
                          {isAdmin && (
                            <>
                            <button type="button" onClick={() => startEditing(animal)} aria-label={`Editar ${animal.caravana}`}><Edit2 size={16} /></button>
                            <button type="button" onClick={() => openDeactivateModal(animal)} disabled={!animal.activo} aria-label={`Dar de baja ${animal.caravana}`} title="Dar de baja"><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {deactivateAnimalTarget && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <div className="panel-header">
              <div>
                <h2>Dar de baja animal</h2>
                <p>Caravana #{deactivateAnimalTarget.caravana}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeDeactivateModal} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>

            <form className="user-form" onSubmit={handleDeactivateSubmit}>
              <label>
                <span>Motivo de baja</span>
                <select
                  value={deactivateFormValues.estadoAnimal}
                  onChange={(event) => setDeactivateFormValues({
                    ...deactivateFormValues,
                    estadoAnimal: event.target.value as MotivoBajaAnimal,
                  })}
                >
                  {motivoBajaOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Observaciones</span>
                <textarea
                  value={deactivateFormValues.observacionesBaja}
                  onChange={(event) => setDeactivateFormValues({
                    ...deactivateFormValues,
                    observacionesBaja: event.target.value,
                  })}
                  rows={4}
                  placeholder="Detalle opcional del motivo de baja"
                />
              </label>

              <div className="form-warning">
                El animal quedara inactivo, pero no se eliminara su historial de eventos, tareas ni genealogia.
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeDeactivateModal} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  <Trash2 size={18} />
                  {isSaving ? 'Dando de baja...' : 'Dar de baja'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {eventAnimal && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <div className="panel-header">
              <div>
                <h2>Registrar evento</h2>
                <p>Caravana #{eventAnimal.caravana}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeEventModal} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>

            {pendingEventConfirmation ? (
              <div className="user-form">
                <div className="form-warning">
                  Este evento puede modificar el estado del animal y generar, cerrar o cancelar tareas automaticas.
                </div>
                <ul className="confirmation-list">
                  {getEventConfirmationDetails(eventFormValues).map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>

                {error && <div className="form-error">{error}</div>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setPendingEventConfirmation(false)}
                    disabled={isSaving}
                  >
                    Volver
                  </button>
                  <button type="button" className="primary-button" onClick={() => void confirmEventRegistration()} disabled={isSaving}>
                    <CalendarPlus size={18} />
                    {isSaving ? 'Registrando...' : 'Confirmar evento'}
                  </button>
                </div>
              </div>
            ) : (
            <form className="user-form" onSubmit={handleEventSubmit}>
              <label>
                <span>Tipo de evento</span>
                <select
                  value={eventFormValues.tipo}
                  onChange={(event) => setEventFormValues({ ...eventFormValues, tipo: event.target.value as TipoEvento })}
                >
                  {tipoEventoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>

              {eventFormValues.tipo === 'TACTO' && (
                <label>
                  <span>Resultado</span>
                  <select
                    value={eventFormValues.resultadoTacto}
                    onChange={(event) => setEventFormValues({ ...eventFormValues, resultadoTacto: event.target.value as 'POSITIVO' | 'NEGATIVO' })}
                  >
                    <option value="POSITIVO">POSITIVO</option>
                    <option value="NEGATIVO">NEGATIVO</option>
                  </select>
                </label>
              )}

              <label>
                <span>Observaciones</span>
                <textarea
                  value={eventFormValues.observaciones}
                  onChange={(event) => setEventFormValues({ ...eventFormValues, observaciones: event.target.value })}
                  rows={4}
                />
              </label>

              {error && <div className="form-error">{error}</div>}

              <button type="submit" className="primary-button" disabled={isSaving}>
                <CalendarPlus size={18} />
                Continuar
              </button>
            </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
