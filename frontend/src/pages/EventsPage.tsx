import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Plus, RefreshCcw, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { getAnimales } from '../services/animalesService';
import { getLotes } from '../services/lotesService';
import { createEvento, getEventos } from '../services/eventosService';
import { getAvailableEventOptions, isReproductiveAnimal } from '../utils/eventRules';
import { formatDateTime } from '../utils/display';
import type { Animal, CategoriaAnimal } from '../types/animales';
import type { Evento, EventoFilters, EventoFormValues, TipoEvento } from '../types/eventos';
import type { Lote, TipoFuncionalLote } from '../types/lotes';

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

const emptyFilters: EventoFilters = {
  tipo: '',
  animalId: '',
  fechaDesde: '',
  fechaHasta: '',
};

const cowLoteTypes: TipoFuncionalLote[] = ['PRODUCCION', 'SECAS', 'PREPARTO', 'RECUPERACION'];
const legacyCowCategoryMap: Partial<Record<CategoriaAnimal, CategoriaAnimal>> = {
  VACA_PRODUCCION: 'VACA',
  VACA_SECA: 'VACA',
  PREPARTO: 'VACA',
};

function localDateInput(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyEventForm(): EventoFormValues {
  return {
    tipo: 'CLINICO',
    fecha: localDateInput(new Date()),
    observaciones: '',
    resultadoTacto: 'POSITIVO',
    cambioLoteDestinoId: '',
    cantidadCrias: 1,
    guacheraLoteId: '',
    crias: [{ categoria: 'TERNERA', estadoNacimiento: 'VIVA', caravana: '', observacion: '' }],
  };
}

function calculateAgeMonths(fechaNacimiento: string) {
  const birthDate = new Date(`${fechaNacimiento}T09:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months += today.getMonth() - birthDate.getMonth();
  if (today.getDate() < birthDate.getDate()) months -= 1;
  return Math.max(months, 0);
}

function toFunctionalCategory(category: CategoriaAnimal): CategoriaAnimal {
  if (category === 'GUACHERA' || category === 'ESCUELITA') return 'TERNERA';
  return legacyCowCategoryMap[category] ?? category;
}

function getCompatibleLoteTypesForAnimal(animal: Animal | null): TipoFuncionalLote[] {
  if (!animal) return [];
  const ageMonths = calculateAgeMonths(localDateInput(animal.fechaNacimiento));
  const category = toFunctionalCategory(animal.categoriaAnimal);

  if (category === 'VACA') return cowLoteTypes;
  if (category === 'VAQUILLONA') return ['TERNERA_2'];
  if (category === 'TORITO') return ['TORITOS'];
  if (category === 'TORO') return ['TOROS'];
  if (category === 'TERNERO' || category === 'TERNERA') {
    if (ageMonths === null || ageMonths < 4) return ['GUACHERA'];
    if (ageMonths < 8) return ['ESCUELITA'];
    return ['TERNERA_1'];
  }
  return [];
}

function buildCrias(cantidadCrias: 1 | 2 | 3, current: EventoFormValues['crias']) {
  return Array.from({ length: cantidadCrias }, (_, index) => (
    current[index] ?? { categoria: 'TERNERA', estadoNacimiento: 'VIVA', caravana: '', observacion: '' }
  ));
}

function renderEventoDetalle(evento: Evento) {
  const datos = evento.datosJson && typeof evento.datosJson === 'object' && !Array.isArray(evento.datosJson)
    ? evento.datosJson as Record<string, unknown>
    : null;
  const parto = datos?.parto && typeof datos.parto === 'object' && !Array.isArray(datos.parto)
    ? datos.parto as { cantidadCrias?: unknown; crias?: unknown }
    : null;
  const cambioLote = datos?.cambioLote && typeof datos.cambioLote === 'object' && !Array.isArray(datos.cambioLote)
    ? datos.cambioLote as { loteAnterior?: { nombre?: string }; loteNuevo?: { nombre?: string }; motivo?: string | null }
    : null;

  if (parto && Array.isArray(parto.crias)) {
    return (
      <div className="event-detail-list">
        <span>{evento.observaciones || `Parto con ${parto.cantidadCrias ?? parto.crias.length} cría(s)`}</span>
        {parto.crias.map((cria, index) => {
          const item = cria as { categoria?: string; estadoNacimiento?: string; caravana?: string | null; agregadaARodeo?: boolean; observacion?: string | null };
          return (
            <small key={index}>
              Cría {index + 1}: {item.categoria} · {item.estadoNacimiento}
              {item.caravana ? ` · #${item.caravana}` : ''}
              {item.agregadaARodeo ? ' · agregada a Rodeo' : ' · no agregada a Rodeo'}
              {item.observacion ? ` · ${item.observacion}` : ''}
            </small>
          );
        })}
      </div>
    );
  }

  if (cambioLote) {
    return (
      <div className="event-detail-list">
        <span>{evento.observaciones || cambioLote.motivo || 'Cambio de lote'}</span>
        <small>{cambioLote.loteAnterior?.nombre ?? '-'} → {cambioLote.loteNuevo?.nombre ?? '-'}</small>
      </div>
    );
  }

  return evento.observaciones || '-';
}

interface EventsPageProps {
  authToken: string | null;
  onUnauthorized: () => void;
}

export function EventsPage({ authToken, onUnauthorized }: EventsPageProps) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [filters, setFilters] = useState<EventoFilters>(emptyFilters);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventFormValues, setEventFormValues] = useState<EventoFormValues>(emptyEventForm);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const selectedAnimal = useMemo(
    () => animales.find((animal) => String(animal.id) === selectedAnimalId) ?? null,
    [animales, selectedAnimalId],
  );
  const activeLotes = useMemo(() => lotes.filter((lote) => lote.activo), [lotes]);

  async function loadData(nextFilters = filters) {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      const [nextEventos, nextAnimales, nextLotes] = await Promise.all([
        getEventos(authToken, nextFilters),
        getAnimales(authToken, { caravana: '', categoriaAnimal: '', loteId: '', estadoReproductivo: '', estadoAnimal: '', activo: '' }),
        getLotes(authToken),
      ]);
      setEventos(nextEventos);
      setAnimales(nextAnimales);
      setLotes(nextLotes);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los eventos.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  function clearFilters() {
    setFilters(emptyFilters);
    void loadData(emptyFilters);
  }

  function openCreateEventModal() {
    const nextAnimalId = filters.animalId || '';
    const animal = animales.find((item) => String(item.id) === nextAnimalId) ?? null;
    const availableEvents = getAvailableEventOptions(animal);
    const guacheraLotes = activeLotes.filter((lote) => lote.tipoFuncional === 'GUACHERA');
    setSelectedAnimalId(nextAnimalId);
    setEventFormValues({
      ...emptyEventForm(),
      tipo: animal ? availableEvents[0] : '',
      guacheraLoteId: guacheraLotes.length === 1 ? String(guacheraLotes[0].id) : '',
    });
    setIsEventModalOpen(true);
    setError('');
    setSuccess('');
  }

  function closeCreateEventModal() {
    setIsEventModalOpen(false);
    setSelectedAnimalId('');
    setEventFormValues(emptyEventForm());
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (!selectedAnimal) {
      setError('Debe seleccionar un animal.');
      return;
    }
    if (!eventFormValues.tipo) {
      setError('Seleccionar tipo de evento.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await createEvento(authToken, selectedAnimal.id, eventFormValues);
      closeCreateEventModal();
      setSuccess('Evento creado correctamente.');
      await loadData(filters);
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setError(saveError instanceof Error ? saveError.message : 'No se pudo crear el evento.');
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(filters), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useDataChangedRefresh(() => loadData(filters), [authToken, filters]);

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Eventos</h2>
          <p>Historial cronologico de eventos del rodeo.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={openCreateEventModal}>
            <Plus size={16} />
            Crear Evento
          </button>
          <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar eventos">
            <RefreshCcw size={18} />
          </button>
        </div>
      </section>

      <section className="panel herd-filters">
        <form className="filters-form events-filters">
          <select value={filters.tipo} onChange={(event) => setFilters({ ...filters, tipo: event.target.value })}>
            <option value="">Tipo de evento</option>
            {tipoEventoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={filters.animalId} onChange={(event) => setFilters({ ...filters, animalId: event.target.value })}>
            <option value="">Todos los animales</option>
            {animales.map((animal) => <option key={animal.id} value={animal.id}>#{animal.caravana}</option>)}
          </select>
          <label className="filter-field">
            <span>Fecha inicio</span>
            <input type="date" value={filters.fechaDesde} onChange={(event) => setFilters({ ...filters, fechaDesde: event.target.value })} />
          </label>
          <label className="filter-field">
            <span>Fecha fin</span>
            <input type="date" value={filters.fechaHasta} onChange={(event) => setFilters({ ...filters, fechaHasta: event.target.value })} />
          </label>
          <button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button>
        </form>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historial</h2>
            <p>{eventos.length} eventos registrados.</p>
          </div>
          <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar historial de eventos">
            <RefreshCcw size={18} />
          </button>
        </div>
        {isLoading ? <p className="table-empty">Cargando eventos...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Animal</th>
                  <th>Usuario</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {[...eventos].sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime()).map((evento) => (
                  <tr key={evento.id}>
                    <td>{formatDateTime(evento.fecha)}</td>
                    <td><span className="status-pill status-active">{evento.tipo}</span></td>
                    <td><strong>#{evento.animal.caravana}</strong><span>{evento.animal.categoriaAnimal}</span></td>
                    <td>{evento.usuario?.nombre ?? 'Sin usuario'}</td>
                    <td>{renderEventoDetalle(evento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isEventModalOpen && (
        <div className="modal-backdrop">
          <section className="modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Crear Evento</h2>
                <p>Registrar un evento sin salir del historial.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeCreateEventModal} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>

            <form className="user-form animal-modal-form" onSubmit={handleCreateEvent}>
              <label>
                <span>Animal</span>
                <select
                  value={selectedAnimalId}
                  onChange={(event) => {
                    const nextAnimalId = event.target.value;
                    const nextAnimal = animales.find((animal) => String(animal.id) === nextAnimalId) ?? null;
                    const availableEvents = getAvailableEventOptions(nextAnimal);
                    setSelectedAnimalId(nextAnimalId);
                    setEventFormValues({
                      ...eventFormValues,
                      tipo: availableEvents.includes(eventFormValues.tipo as TipoEvento) ? eventFormValues.tipo : '',
                      cambioLoteDestinoId: '',
                      guacheraLoteId: '',
                    });
                  }}
                  required
                >
                  <option value="">Seleccionar animal</option>
                  {animales.map((animal) => (
                    <option key={animal.id} value={animal.id}>#{animal.caravana} {animal.nombre ? `- ${animal.nombre}` : ''}</option>
                  ))}
                </select>
              </label>

              {selectedAnimal && !isReproductiveAnimal(selectedAnimal) && (
                <div className="form-warning animal-form-message">
                  El animal debe ser Vaquillona o Vaca y tener al menos 13 meses para registrar eventos reproductivos.
                </div>
              )}

              <label>
                <span>Tipo de evento</span>
                <select
                  value={eventFormValues.tipo}
                  onChange={(event) => {
                    const nextTipo = event.target.value as TipoEvento | '';
                    const guacheraLotes = activeLotes.filter((lote) => lote.tipoFuncional === 'GUACHERA');
                    setEventFormValues({
                      ...eventFormValues,
                      tipo: nextTipo,
                      guacheraLoteId: nextTipo === 'PARTO' && guacheraLotes.length === 1
                        ? String(guacheraLotes[0].id)
                        : eventFormValues.guacheraLoteId,
                    });
                  }}
                  required
                >
                  <option value="">Seleccionar tipo de evento</option>
                  {getAvailableEventOptions(selectedAnimal).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              {eventFormValues.tipo === 'CAMBIO_LOTE' && selectedAnimal && (
                <>
                  <div className="form-warning animal-form-message">
                    Lote actual: {selectedAnimal.lote.nombre}. Seleccione un lote destino compatible.
                  </div>
                  <label>
                    <span>Lote destino</span>
                    <select
                      value={eventFormValues.cambioLoteDestinoId}
                      onChange={(event) => setEventFormValues({ ...eventFormValues, cambioLoteDestinoId: event.target.value })}
                      required
                    >
                      <option value="">Seleccionar lote</option>
                      {activeLotes
                        .filter((lote) => getCompatibleLoteTypesForAnimal(selectedAnimal).includes(lote.tipoFuncional))
                        .map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
                    </select>
                  </label>
                </>
              )}

              <label>
                <span>Fecha del evento</span>
                <input
                  type="date"
                  value={eventFormValues.fecha}
                  onChange={(event) => setEventFormValues({ ...eventFormValues, fecha: event.target.value })}
                  required
                />
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

              {eventFormValues.tipo === 'PARTO' && (
                <>
                  <label>
                    <span>Crías nacidas</span>
                    <select
                      value={eventFormValues.cantidadCrias}
                      onChange={(event) => {
                        const cantidadCrias = Number(event.target.value) as 1 | 2 | 3;
                        setEventFormValues({
                          ...eventFormValues,
                          cantidadCrias,
                          crias: buildCrias(cantidadCrias, eventFormValues.crias),
                        });
                      }}
                    >
                      <option value={1}>Simple</option>
                      <option value={2}>Mellizos</option>
                      <option value={3}>Trillizos</option>
                    </select>
                  </label>
                  <label>
                    <span>Lote Guachera para crías vivas</span>
                    <select
                      value={eventFormValues.guacheraLoteId}
                      onChange={(event) => setEventFormValues({ ...eventFormValues, guacheraLoteId: event.target.value })}
                      required={eventFormValues.crias.some((cria) => cria.estadoNacimiento === 'VIVA')}
                    >
                      <option value="">Seleccionar Guachera</option>
                      {activeLotes
                        .filter((lote) => lote.tipoFuncional === 'GUACHERA')
                        .map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
                    </select>
                  </label>
                  {activeLotes.every((lote) => lote.tipoFuncional !== 'GUACHERA') && (
                    <div className="form-error animal-form-message">No existe un lote Guachera activo para registrar crías vivas.</div>
                  )}
                  <div className="form-warning animal-form-message">
                    La caravana es obligatoria para crías nacidas vivas.
                  </div>
                  <div className="form-warning animal-form-message">
                    Las crías nacidas muertas se registran en el parto, pero no se agregan al Rodeo.
                  </div>
                  {eventFormValues.crias.map((cria, index) => (
                    <div className="form-subsection" key={index}>
                      <label>
                        <span>Cría {index + 1}</span>
                        <select
                          value={cria.categoria}
                          onChange={(event) => {
                            const crias = [...eventFormValues.crias];
                            crias[index] = { ...cria, categoria: event.target.value as 'TERNERO' | 'TERNERA' };
                            setEventFormValues({ ...eventFormValues, crias });
                          }}
                        >
                          <option value="TERNERO">Ternero</option>
                          <option value="TERNERA">Ternera</option>
                        </select>
                      </label>
                      <label>
                        <span>Estado al nacer</span>
                        <select
                          value={cria.estadoNacimiento}
                          onChange={(event) => {
                            const crias = [...eventFormValues.crias];
                            crias[index] = { ...cria, estadoNacimiento: event.target.value as 'VIVA' | 'MUERTA' };
                            setEventFormValues({ ...eventFormValues, crias });
                          }}
                        >
                          <option value="VIVA">Viva</option>
                          <option value="MUERTA">Muerta</option>
                        </select>
                      </label>
                      <label>
                        <span>Caravana</span>
                        <input
                          value={cria.caravana}
                          onChange={(event) => {
                            const crias = [...eventFormValues.crias];
                            crias[index] = { ...cria, caravana: event.target.value };
                            setEventFormValues({ ...eventFormValues, crias });
                          }}
                          required={cria.estadoNacimiento === 'VIVA'}
                        />
                      </label>
                      <label>
                        <span>Observación</span>
                        <input
                          value={cria.observacion}
                          onChange={(event) => {
                            const crias = [...eventFormValues.crias];
                            crias[index] = { ...cria, observacion: event.target.value };
                            setEventFormValues({ ...eventFormValues, crias });
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </>
              )}

              <label className="animal-form-message">
                <span>Observaciones</span>
                <textarea
                  value={eventFormValues.observaciones}
                  onChange={(event) => setEventFormValues({ ...eventFormValues, observaciones: event.target.value })}
                  rows={4}
                />
              </label>

              <div className="modal-actions animal-form-actions">
                <button type="button" className="secondary-button" onClick={closeCreateEventModal} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  <CalendarPlus size={18} />
                  {isSaving ? 'Guardando...' : 'Crear evento'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
