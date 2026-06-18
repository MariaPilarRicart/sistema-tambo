import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Droplets, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { getAnimales } from '../services/animalesService';
import { createProduccion, deleteProduccion, getProducciones, getResumenProduccion } from '../services/produccionService';
import type { Animal, CategoriaAnimal, EstadoReproductivo } from '../types/animales';
import type { AuthUser } from '../types/auth';
import type { Ordene, ProduccionFilters, ProduccionFormValues, ProduccionResumen, TurnoOrdene } from '../types/produccion';

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const emptyForm: ProduccionFormValues = {
  fecha: localDateValue(),
  turno: 'MANANA',
  litrosBuenos: '',
  litrosDescartados: '0',
  observaciones: '',
  detalles: [],
};

const emptyFilters: ProduccionFilters = {
  fechaDesde: localDateValue(),
  fechaHasta: localDateValue(),
  turno: '',
};

const turnoLabels: Record<TurnoOrdene, string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
};

const categoriaLabels: Record<CategoriaAnimal, string> = {
  GUACHERA: 'Guachera',
  ESCUELITA: 'Escuelita',
  TERNERO: 'Ternero',
  TERNERA: 'Ternera',
  VAQUILLONA: 'Vaquillona',
  VACA: 'Vaca',
  VACA_PRODUCCION: 'Vaca en producción',
  VACA_SECA: 'Vaca seca',
  PREPARTO: 'Preparto',
  TORITO: 'Torito',
  TORO: 'Toro',
  BAJA: 'Baja',
};

const estadoReproductivoLabels: Record<EstadoReproductivo, string> = {
  NO_APLICA: 'No aplica',
  VACIA: 'Vacía',
  INSEMINADA: 'Inseminada',
  PRENADA: 'Preñada',
  SECA: 'Seca',
  RECUPERACION: 'Recuperación',
};

interface ProduccionViewProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

interface PendingDeleteConfirmation {
  onConfirm: () => Promise<void>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR');
}

function formatLiters(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} l`;
}

function ordeneTotal(ordene: Ordene) {
  return Number(ordene.litrosBuenos ?? 0) + Number(ordene.litrosDescartados ?? 0);
}

function detalleTotal(ordene: Ordene) {
  return ordene.detalles.reduce((total, detalle) => total + Number(detalle.litros ?? 0), 0);
}

function animalLabel(animal: Pick<Animal, 'caravana' | 'nombre' | 'categoriaAnimal' | 'estadoReproductivo' | 'lote'>) {
  const name = animal.nombre ? ` - ${animal.nombre}` : '';
  return `Caravana ${animal.caravana}${name} - ${categoriaLabels[animal.categoriaAnimal]} - ${estadoReproductivoLabels[animal.estadoReproductivo]} - ${animal.lote.nombre}`;
}

function isAnimalHabilitadoParaOrdene(animal: Animal) {
  return (
    animal.activo &&
    animal.estadoAnimal === 'ACTIVO' &&
    animal.categoriaAnimal === 'VACA' &&
    (animal.lote.tipoFuncional === 'PRODUCCION' || animal.lote.tipoFuncional === 'RECUPERACION') &&
    animal.lote.activo
  );
}

export function ProduccionView({ authToken, currentUser, onUnauthorized }: ProduccionViewProps) {
  const [registros, setRegistros] = useState<Ordene[]>([]);
  const [resumen, setResumen] = useState<ProduccionResumen | null>(null);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [form, setForm] = useState<ProduccionFormValues>(emptyForm);
  const [filters, setFilters] = useState<ProduccionFilters>(emptyFilters);
  const [showOrdeneModal, setShowOrdeneModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteConfirmation, setPendingDeleteConfirmation] = useState<PendingDeleteConfirmation | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const animalesHabilitados = useMemo(() => animales.filter(isAnimalHabilitadoParaOrdene), [animales]);
  const selectedDetalleAnimalIds = useMemo(() => new Set(form.detalles.map((detalle) => detalle.animalId).filter(Boolean)), [form.detalles]);
  const hasDiscard = Number(form.litrosDescartados || 0) > 0;

  async function loadData() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');
    try {
      const [registrosData, resumenData, animalesData] = await Promise.all([
        getProducciones(authToken, filters),
        getResumenProduccion(authToken),
        getAnimales(authToken, { caravana: '', categoriaAnimal: 'VACA', loteId: '', estadoReproductivo: '', estadoAnimal: 'ACTIVO', activo: 'true' }),
      ]);
      setRegistros(registrosData);
      setResumen(resumenData);
      setAnimales(animalesData);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) onUnauthorized();
      else setError(err instanceof Error ? err.message : 'No se pudo cargar producción.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [authToken, filters.fechaDesde, filters.fechaHasta, filters.turno]);

  useDataChangedRefresh(loadData, [authToken, filters.fechaDesde, filters.fechaHasta, filters.turno]);

  function updateForm(values: Partial<ProduccionFormValues>) {
    setForm((current) => ({ ...current, ...values }));
  }

  function openOrdeneModal() {
    setForm(emptyForm);
    setShowOrdeneModal(true);
    setError('');
    setSuccess('');
  }

  function closeOrdeneModal() {
    setShowOrdeneModal(false);
    setForm(emptyForm);
  }

  function addDetalle() {
    setForm((current) => ({
      ...current,
      detalles: [...current.detalles, { animalId: '', litros: '', observaciones: '' }],
    }));
  }

  function updateDetalle(index: number, values: Partial<ProduccionFormValues['detalles'][number]>) {
    setForm((current) => ({
      ...current,
      detalles: current.detalles.map((detalle, currentIndex) => (currentIndex === index ? { ...detalle, ...values } : detalle)),
    }));
  }

  function removeDetalle(index: number) {
    setForm((current) => ({
      ...current,
      detalles: current.detalles.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await createProduccion(authToken, form);
      setSuccess('Ordeñe registrado correctamente.');
      closeOrdeneModal();
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) onUnauthorized();
      else setError(err instanceof Error ? err.message : 'No se pudo registrar el ordeñe.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRegistro(registro: Ordene) {
    setPendingDeleteConfirmation({
      onConfirm: async () => {
        if (!authToken) return;
        setIsSaving(true);
        setError('');
        try {
          await deleteProduccion(authToken, registro.id);
          setSuccess('Ordeñe dado de baja correctamente.');
          await loadData();
        } catch (err) {
          if (err instanceof ApiError && err.statusCode === 401) onUnauthorized();
          else setError(err instanceof Error ? err.message : 'No se pudo dar de baja el ordeñe.');
        } finally {
          setIsSaving(false);
          setPendingDeleteConfirmation(null);
        }
      },
    });
  }

  return (
    <div className="module-page production-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Producción</p>
          <h1>Ordeñes</h1>
          <span>Registro diario por fecha y turno, con detalle opcional por vaca.</span>
        </div>
        <button type="button" className="primary-button" onClick={openOrdeneModal}>
          <Plus size={18} /> Nuevo ordeñe
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      {resumen?.alertaDescarte && <div className="form-warning">Hay litros descartados registrados para hoy.</div>}

      {pendingDeleteConfirmation && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Confirmar baja</h2>
                <p>El registro queda inactivo para conservar el historial.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setPendingDeleteConfirmation(null)} aria-label="Cerrar confirmación">
                <X size={18} />
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setPendingDeleteConfirmation(null)} disabled={isSaving}>
                Cancelar
              </button>
              <button type="button" className="danger-button" onClick={() => void pendingDeleteConfirmation.onConfirm()} disabled={isSaving}>
                Confirmar baja
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="dashboard-kpi-grid production-kpi-grid">
        <article className="dashboard-kpi-card dashboard-kpi-emerald">
          <strong>Litros buenos hoy</strong>
          <h3>{formatLiters(resumen?.totalLitrosBuenos)}</h3>
        </article>
        <article className="dashboard-kpi-card dashboard-kpi-amber">
          <strong>Descartados hoy</strong>
          <h3>{formatLiters(resumen?.totalLitrosDescartados)}</h3>
        </article>
        <article className="dashboard-kpi-card dashboard-kpi-blue">
          <strong>Total ordeñado</strong>
          <h3>{formatLiters(resumen?.totalLitros)}</h3>
        </article>
        <article className="dashboard-kpi-card dashboard-kpi-indigo">
          <strong>Ordeñes hoy</strong>
          <h3>{resumen?.cantidadOrdenes ?? 0}</h3>
        </article>
        <article className="dashboard-kpi-card dashboard-kpi-pink">
          <strong>Detalle individual</strong>
          <h3>{formatLiters(resumen?.totalIndividualCargado)}</h3>
        </article>
        <article className="dashboard-kpi-card dashboard-kpi-rose">
          <strong>Promedio por ordeñe</strong>
          <h3>{formatLiters(resumen?.promedioPorOrdene)}</h3>
        </article>
      </section>

      <section className="panel" id="historial-produccion-section">
        <div className="panel-header">
          <div>
            <h2>Historial</h2>
            <p>Ordeñes agrupados por fecha y turno.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={openOrdeneModal}>
              <Plus size={16} /> Nuevo ordeñe
            </button>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar historial de producción">
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters production-history-filters">
          <label className="filter-field">
            <span>Fecha desde</span>
            <input type="date" value={filters.fechaDesde} onChange={(event) => setFilters({ ...filters, fechaDesde: event.target.value })} />
          </label>
          <label className="filter-field">
            <span>Fecha hasta</span>
            <input type="date" value={filters.fechaHasta} onChange={(event) => setFilters({ ...filters, fechaHasta: event.target.value })} />
          </label>
          <label className="filter-field">
            <span>Turno</span>
            <select value={filters.turno} onChange={(event) => setFilters({ ...filters, turno: event.target.value })}>
              <option value="">Todos</option>
              {Object.entries(turnoLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={clearFilters}>
            Limpiar
          </button>
        </form>
        {isLoading ? (
          <p className="table-empty">Cargando producción...</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table production-history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Turno</th>
                  <th>Litros buenos</th>
                  <th>Descartados</th>
                  <th>Total</th>
                  <th>Detalle individual</th>
                  <th>Vacas</th>
                  <th>Observaciones</th>
                  <th>Usuario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id} className={!registro.activo ? 'stock-inactive-row' : undefined}>
                    <td>{formatDate(registro.fecha)}</td>
                    <td>{turnoLabels[registro.turno]}</td>
                    <td>{formatLiters(registro.litrosBuenos)}</td>
                    <td>{formatLiters(registro.litrosDescartados)}</td>
                    <td>
                      <strong>{formatLiters(ordeneTotal(registro))}</strong>
                    </td>
                    <td>{formatLiters(detalleTotal(registro))}</td>
                    <td>
                      <strong>{registro.detalles.length}</strong>
                      <span>{registro.detalles.slice(0, 2).map((detalle) => detalle.animal.caravana).join(', ')}</span>
                    </td>
                    <td>{registro.observaciones ?? '-'}</td>
                    <td>{registro.usuario?.nombre ?? '-'}</td>
                    <td>
                      {isAdmin && registro.activo && (
                        <button type="button" className="icon-button" onClick={() => void handleDeleteRegistro(registro)} aria-label="Dar de baja ordeñe">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={10}>Sin ordeñes para los filtros seleccionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showOrdeneModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal production-ordene-modal">
            <div className="panel-header">
              <div>
                <h2>Nuevo ordeñe</h2>
                <p>Cargá el total del turno. El detalle por vaca es opcional.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeOrdeneModal} aria-label="Cerrar nuevo ordeñe">
                <X size={18} />
              </button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleSubmit}>
              <label>
                <span>Fecha</span>
                <input type="date" value={form.fecha} onChange={(event) => updateForm({ fecha: event.target.value })} required />
              </label>
              <label>
                <span>Turno</span>
                <select value={form.turno} onChange={(event) => updateForm({ turno: event.target.value as TurnoOrdene })}>
                  {Object.entries(turnoLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Litros buenos</span>
                <input type="number" min="0" step="0.01" value={form.litrosBuenos} onChange={(event) => updateForm({ litrosBuenos: event.target.value })} required />
              </label>
              <label>
                <span>Litros descartados</span>
                <input type="number" min="0" step="0.01" value={form.litrosDescartados} onChange={(event) => updateForm({ litrosDescartados: event.target.value })} required />
              </label>
              {hasDiscard && (
                <p className="production-wide-field table-empty">
                  Los litros descartados quedan registrados a nivel del ordeñe. Usá observaciones para indicar el motivo si corresponde.
                </p>
              )}
              <label className="production-wide-field">
                <span>Observaciones</span>
                <textarea rows={2} value={form.observaciones} onChange={(event) => updateForm({ observaciones: event.target.value })} />
              </label>

              <div className="production-wide-field">
                <div className="panel-header production-detail-header">
                  <div>
                    <h3>Detalle por vaca</h3>
                    <p>Solo se pueden seleccionar vacas activas en lotes de Producción o Recuperación.</p>
                  </div>
                  <button type="button" className="secondary-button" onClick={addDetalle}>
                    <Plus size={16} /> Agregar vaca
                  </button>
                </div>
                {form.detalles.map((detalle, index) => (
                  <div className="production-detail-row" key={`${index}-${detalle.animalId || 'nuevo'}`}>
                    <label>
                      <span>Vaca</span>
                      <select value={detalle.animalId} onChange={(event) => updateDetalle(index, { animalId: event.target.value })} required>
                        <option value="">Seleccionar vaca</option>
                        {animalesHabilitados
                          .filter((animal) => !selectedDetalleAnimalIds.has(String(animal.id)) || detalle.animalId === String(animal.id))
                          .map((animal) => (
                            <option key={animal.id} value={animal.id}>
                              {animalLabel(animal)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      <span>Litros</span>
                      <input type="number" min="0" step="0.01" value={detalle.litros} onChange={(event) => updateDetalle(index, { litros: event.target.value })} required />
                    </label>
                    <label>
                      <span>Observaciones</span>
                      <input value={detalle.observaciones} onChange={(event) => updateDetalle(index, { observaciones: event.target.value })} />
                    </label>
                    <button type="button" className="icon-button" onClick={() => removeDetalle(index)} aria-label="Quitar vaca">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {form.detalles.length === 0 && (
                  <p className="table-empty">
                    Sin detalle individual cargado. El ordeñe se puede guardar solo con los litros totales.
                  </p>
                )}
              </div>

              <div className="modal-actions production-wide-field">
                <button type="button" className="secondary-button" onClick={closeOrdeneModal} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  <Save size={18} /> Guardar ordeñe
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Vacas habilitadas</h2>
            <p>Compatibles con producción por lote funcional.</p>
          </div>
          <Droplets size={20} />
        </div>
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Caravana</th>
                <th>Nombre</th>
                <th>Lote</th>
                <th>Estado reproductivo</th>
              </tr>
            </thead>
            <tbody>
              {animalesHabilitados.map((animal) => (
                <tr key={animal.id}>
                  <td>{animal.caravana}</td>
                  <td>{animal.nombre ?? '-'}</td>
                  <td>{animal.lote.nombre}</td>
                  <td>{estadoReproductivoLabels[animal.estadoReproductivo]}</td>
                </tr>
              ))}
              {animalesHabilitados.length === 0 && (
                <tr>
                  <td colSpan={4}>No hay vacas activas en lotes de Producción o Recuperación.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
