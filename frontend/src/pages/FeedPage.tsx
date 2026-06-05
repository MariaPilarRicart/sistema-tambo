import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Edit2, Package, Plus, RefreshCcw, Trash2, Wheat, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import {
  createRacion,
  createRegistroAlimentacion,
  createInsumoAlimentacion,
  createMovimientoStockAlimentacion,
  deactivateInsumoAlimentacion,
  deactivateRacion,
  getInsumosAlimentacion,
  getMovimientosStockAlimentacion,
  getRaciones,
  getRegistrosAlimentacion,
  getResumenAlimentacion,
  getResumenStockAlimentacion,
  updateInsumoAlimentacion,
  updateRacion,
} from '../services/alimentacionService';
import type {
  AlimentacionResumen,
  InsumoAlimentacion,
  InsumoAlimentacionFormValues,
  MovimientoStockAlimentacion,
  MovimientoStockAlimentacionFormValues,
  Racion,
  RacionFormValues,
  RegistroAlimentacion,
  RegistroAlimentacionFormValues,
  StockAlimentacionResumen,
} from '../types/alimentacion';
import type { CategoriaAnimal } from '../types/animales';
import type { AuthUser } from '../types/auth';

const categoriaOptions: CategoriaAnimal[] = ['GUACHERA', 'ESCUELITA', 'TERNERA', 'VAQUILLONA', 'VACA_PRODUCCION', 'VACA_SECA', 'PREPARTO'];

const emptyRacionForm: RacionFormValues = {
  nombre: '',
  descripcion: '',
  categoriaAnimal: '',
  activa: true,
};

const emptyRegistroForm: RegistroAlimentacionFormValues = {
  fecha: new Date().toISOString().slice(0, 10),
  categoriaAnimal: '',
  racionId: '',
  cantidadKg: '',
  observaciones: '',
};

const emptyInsumoForm: InsumoAlimentacionFormValues = {
  nombre: '',
  descripcion: '',
  unidadMedida: 'KG',
  stockMinimo: '0',
  activo: true,
};

const emptyMovimientoStockForm: MovimientoStockAlimentacionFormValues = {
  fecha: new Date().toISOString().slice(0, 10),
  insumoId: '',
  tipoMovimiento: 'ENTRADA',
  cantidad: '',
  observaciones: '',
};

interface FeedPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatKg(value: number) {
  return `${Number(value).toLocaleString()} kg`;
}

function formatStock(value: number, unidad: string) {
  return `${Number(value).toLocaleString()} ${unidad}`;
}

export function FeedPage({ authToken, currentUser, onUnauthorized }: FeedPageProps) {
  const [raciones, setRaciones] = useState<Racion[]>([]);
  const [registros, setRegistros] = useState<RegistroAlimentacion[]>([]);
  const [resumen, setResumen] = useState<AlimentacionResumen | null>(null);
  const [insumos, setInsumos] = useState<InsumoAlimentacion[]>([]);
  const [movimientosStock, setMovimientosStock] = useState<MovimientoStockAlimentacion[]>([]);
  const [resumenStock, setResumenStock] = useState<StockAlimentacionResumen | null>(null);
  const [racionForm, setRacionForm] = useState<RacionFormValues>(emptyRacionForm);
  const [registroForm, setRegistroForm] = useState<RegistroAlimentacionFormValues>(emptyRegistroForm);
  const [insumoForm, setInsumoForm] = useState<InsumoAlimentacionFormValues>(emptyInsumoForm);
  const [movimientoStockForm, setMovimientoStockForm] =
    useState<MovimientoStockAlimentacionFormValues>(emptyMovimientoStockForm);
  const [editingRacion, setEditingRacion] = useState<Racion | null>(null);
  const [editingInsumo, setEditingInsumo] = useState<InsumoAlimentacion | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const activeRaciones = useMemo(() => raciones.filter((racion) => racion.activa), [raciones]);
  const activeInsumos = useMemo(() => insumos.filter((insumo) => insumo.activo), [insumos]);
  const maxKgByLote = useMemo(
    () => Math.max(...(resumen?.alimentacionPorCategoria.map((item) => item.totalKg) ?? [1]), 1),
    [resumen],
  );
  const stockTotalRegistrado = useMemo(
    () => activeInsumos.reduce((total, insumo) => total + insumo.stockActual, 0),
    [activeInsumos],
  );

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }

    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  async function loadData() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      const [
        nextRaciones,
        nextRegistros,
        nextResumen,
        nextInsumos,
        nextMovimientosStock,
        nextResumenStock,
      ] = await Promise.all([
        getRaciones(authToken),
        getRegistrosAlimentacion(authToken),
        getResumenAlimentacion(authToken),
        getInsumosAlimentacion(authToken),
        getMovimientosStockAlimentacion(authToken),
        getResumenStockAlimentacion(authToken),
      ]);
      setRaciones(nextRaciones);
      setRegistros(nextRegistros);
      setResumen(nextResumen);
      setInsumos(nextInsumos);
      setMovimientosStock(nextMovimientosStock);
      setResumenStock(nextResumenStock);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar alimentacion.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  function resetRacionForm() {
    setEditingRacion(null);
    setRacionForm(emptyRacionForm);
  }

  function startEditingRacion(racion: Racion) {
    setEditingRacion(racion);
    setRacionForm({
      nombre: racion.nombre,
      descripcion: racion.descripcion ?? '',
      categoriaAnimal: racion.categoriaAnimal ?? '',
      activa: racion.activa,
    });
    setError('');
    setSuccess('');
  }

  function resetInsumoForm() {
    setEditingInsumo(null);
    setInsumoForm(emptyInsumoForm);
  }

  function startEditingInsumo(insumo: InsumoAlimentacion) {
    setEditingInsumo(insumo);
    setInsumoForm({
      nombre: insumo.nombre,
      descripcion: insumo.descripcion ?? '',
      unidadMedida: insumo.unidadMedida,
      stockMinimo: String(insumo.stockMinimo),
      activo: insumo.activo,
    });
    setError('');
    setSuccess('');
  }

  async function handleRacionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingRacion) {
        await updateRacion(authToken, editingRacion.id, racionForm);
        setSuccess('Racion actualizada correctamente.');
      } else {
        await createRacion(authToken, racionForm);
        setSuccess('Racion creada correctamente.');
      }
      resetRacionForm();
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo guardar la racion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateRacion(racion: Racion) {
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await deactivateRacion(authToken, racion.id);
      setSuccess('Racion dada de baja correctamente.');
      await loadData();
    } catch (deleteError) {
      handleRequestError(deleteError, 'No se pudo dar de baja la racion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegistroSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await createRegistroAlimentacion(authToken, registroForm);
      setRegistroForm(emptyRegistroForm);
      setSuccess('Alimentacion registrada correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar la alimentacion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInsumoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingInsumo) {
        await updateInsumoAlimentacion(authToken, editingInsumo.id, insumoForm);
        setSuccess('Insumo actualizado correctamente.');
      } else {
        await createInsumoAlimentacion(authToken, insumoForm);
        setSuccess('Insumo creado correctamente.');
      }
      resetInsumoForm();
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo guardar el insumo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateInsumo(insumo: InsumoAlimentacion) {
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await deactivateInsumoAlimentacion(authToken, insumo.id);
      setSuccess('Insumo dado de baja correctamente.');
      await loadData();
    } catch (deleteError) {
      handleRequestError(deleteError, 'No se pudo dar de baja el insumo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMovimientoStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await createMovimientoStockAlimentacion(authToken, movimientoStockForm);
      setMovimientoStockForm(emptyMovimientoStockForm);
      setSuccess('Movimiento de stock registrado correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar el movimiento de stock.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Alimentacion</h2>
          <p>Raciones, entregas por categoría e historial operativo.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar alimentacion">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="operative-summary-grid">
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-emerald"><Wheat size={20} /></div>
          <p className="metric-title">Kg entregados</p>
          <strong className="metric-value">{formatKg(resumen?.totalKgEntregados ?? 0)}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-blue"><Wheat size={20} /></div>
          <p className="metric-title">Registros de hoy</p>
          <strong className="metric-value">{resumen?.registrosHoy ?? 0}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-indigo"><Wheat size={20} /></div>
          <p className="metric-title">Raciones activas</p>
          <strong className="metric-value">{resumen?.racionesActivas ?? 0}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-amber"><Wheat size={20} /></div>
          <p className="metric-title">Categorías alimentadas</p>
          <strong className="metric-value">{resumen?.categoriasAlimentadas ?? 0}</strong>
        </article>
      </div>

      <div className="feed-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Raciones</h2>
              <p>{isAdmin ? 'Alta, edicion y baja logica.' : 'Consulta de raciones.'}</p>
            </div>
            {editingRacion && (
              <button type="button" className="icon-button" onClick={resetRacionForm} aria-label="Cancelar edicion">
                <X size={18} />
              </button>
            )}
          </div>

          {isAdmin && (
            <form className="user-form" onSubmit={handleRacionSubmit}>
              <label>
                <span>Categoría animal</span>
                <select value={racionForm.categoriaAnimal} onChange={(event) => setRacionForm({ ...racionForm, categoriaAnimal: event.target.value as RacionFormValues['categoriaAnimal'] })}>
                  <option value="">Sin categoría fija</option>
                  {categoriaOptions.map((categoriaAnimal) => <option key={categoriaAnimal} value={categoriaAnimal}>{categoriaAnimal}</option>)}
                </select>
              </label>
              <label>
                <span>Nombre</span>
                <input
                  value={racionForm.nombre}
                  onChange={(event) => setRacionForm({ ...racionForm, nombre: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>Descripcion</span>
                <input
                  value={racionForm.descripcion}
                  onChange={(event) => setRacionForm({ ...racionForm, descripcion: event.target.value })}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={racionForm.activa}
                  onChange={(event) => setRacionForm({ ...racionForm, activa: event.target.checked })}
                />
                <span>Racion activa</span>
              </label>
              <button type="submit" className="primary-button" disabled={isSaving}>
                <Plus size={18} />
                {isSaving ? 'Guardando...' : editingRacion ? 'Guardar racion' : 'Crear racion'}
              </button>
            </form>
          )}

          <div className="table-wrap feed-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {raciones.map((racion) => (
                  <tr key={racion.id}>
                    <td><strong>{racion.nombre}</strong><span>{racion.descripcion || 'Sin descripcion'}</span></td>
                    <td><span className={`status-pill ${racion.activa ? 'status-active' : 'status-inactive'}`}>{racion.activa ? 'ACTIVA' : 'INACTIVA'}</span></td>
                    <td>
                      {isAdmin && (
                        <div className="table-actions">
                          <button type="button" onClick={() => startEditingRacion(racion)} aria-label={`Editar ${racion.nombre}`}><Edit2 size={16} /></button>
                          <button type="button" onClick={() => void handleDeactivateRacion(racion)} disabled={!racion.activa} aria-label={`Dar de baja ${racion.nombre}`}><Trash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {raciones.length === 0 && <tr><td colSpan={3}>Sin raciones cargadas.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Registrar alimentacion</h2>
              <p>Entrega de alimento por categoría productiva.</p>
            </div>
          </div>
          <form className="user-form" onSubmit={handleRegistroSubmit}>
            <label>
              <span>Fecha</span>
              <input type="date" value={registroForm.fecha} onChange={(event) => setRegistroForm({ ...registroForm, fecha: event.target.value })} required />
            </label>
            <label>
              <span>Categoría animal</span>
              <select value={registroForm.categoriaAnimal} onChange={(event) => setRegistroForm({ ...registroForm, categoriaAnimal: event.target.value as RegistroAlimentacionFormValues['categoriaAnimal'] })} required>
                <option value="">Seleccionar categoría</option>
                {categoriaOptions.map((categoriaAnimal) => <option key={categoriaAnimal} value={categoriaAnimal}>{categoriaAnimal}</option>)}
              </select>
            </label>
            <label>
              <span>Racion</span>
              <select value={registroForm.racionId} onChange={(event) => setRegistroForm({ ...registroForm, racionId: event.target.value })} required>
                <option value="">Seleccionar racion</option>
                {activeRaciones.map((racion) => <option key={racion.id} value={racion.id}>{racion.nombre}</option>)}
              </select>
            </label>
            <label>
              <span>Cantidad kg</span>
              <input type="number" min="0.01" step="0.01" value={registroForm.cantidadKg} onChange={(event) => setRegistroForm({ ...registroForm, cantidadKg: event.target.value })} required />
            </label>
            <label>
              <span>Observaciones</span>
              <textarea value={registroForm.observaciones} onChange={(event) => setRegistroForm({ ...registroForm, observaciones: event.target.value })} rows={4} />
            </label>
            <button type="submit" className="primary-button" disabled={isSaving || activeRaciones.length === 0}>
              <Wheat size={18} />
              {isSaving ? 'Registrando...' : 'Registrar alimentacion'}
            </button>
          </form>
        </section>
      </div>

      <section className="settings-header stock-header">
        <div>
          <h2>Stock de alimentos</h2>
          <p>Insumos, movimientos y alertas de bajo stock.</p>
        </div>
      </section>

      <div className="operative-summary-grid">
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-emerald"><Package size={20} /></div>
          <p className="metric-title">Insumos activos</p>
          <strong className="metric-value">{resumenStock?.totalInsumosActivos ?? 0}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-amber"><AlertTriangle size={20} /></div>
          <p className="metric-title">Bajo stock</p>
          <strong className="metric-value">{resumenStock?.insumosBajoStock.length ?? 0}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-blue"><Boxes size={20} /></div>
          <p className="metric-title">Movimientos de hoy</p>
          <strong className="metric-value">{resumenStock?.movimientosHoy ?? 0}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-indigo"><Package size={20} /></div>
          <p className="metric-title">Stock total registrado</p>
          <strong className="metric-value">{Number(stockTotalRegistrado).toLocaleString()}</strong>
        </article>
      </div>

      <div className="feed-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Insumos</h2>
              <p>{isAdmin ? 'Alta, edicion y baja logica.' : 'Consulta de insumos.'}</p>
            </div>
            {editingInsumo && (
              <button type="button" className="icon-button" onClick={resetInsumoForm} aria-label="Cancelar edicion de insumo">
                <X size={18} />
              </button>
            )}
          </div>

          {isAdmin && (
            <form className="user-form" onSubmit={handleInsumoSubmit}>
              <label>
                <span>Nombre</span>
                <input
                  value={insumoForm.nombre}
                  onChange={(event) => setInsumoForm({ ...insumoForm, nombre: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>Descripcion</span>
                <input
                  value={insumoForm.descripcion}
                  onChange={(event) => setInsumoForm({ ...insumoForm, descripcion: event.target.value })}
                />
              </label>
              <label>
                <span>Unidad de medida</span>
                <select
                  value={insumoForm.unidadMedida}
                  onChange={(event) => setInsumoForm({ ...insumoForm, unidadMedida: event.target.value })}
                  required
                >
                  <option value="KG">KG</option>
                  <option value="BOLSA">BOLSA</option>
                  <option value="LITRO">LITRO</option>
                  <option value="UNIDAD">UNIDAD</option>
                </select>
              </label>
              <label>
                <span>Stock minimo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={insumoForm.stockMinimo}
                  onChange={(event) => setInsumoForm({ ...insumoForm, stockMinimo: event.target.value })}
                  required
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={insumoForm.activo}
                  onChange={(event) => setInsumoForm({ ...insumoForm, activo: event.target.checked })}
                />
                <span>Insumo activo</span>
              </label>
              <button type="submit" className="primary-button" disabled={isSaving}>
                <Plus size={18} />
                {isSaving ? 'Guardando...' : editingInsumo ? 'Guardar insumo' : 'Crear insumo'}
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Registrar movimiento de stock</h2>
              <p>Entradas, consumos y ajustes de inventario.</p>
            </div>
          </div>
          <form className="user-form" onSubmit={handleMovimientoStockSubmit}>
            <label>
              <span>Fecha</span>
              <input
                type="date"
                value={movimientoStockForm.fecha}
                onChange={(event) => setMovimientoStockForm({ ...movimientoStockForm, fecha: event.target.value })}
                required
              />
            </label>
            <label>
              <span>Insumo</span>
              <select
                value={movimientoStockForm.insumoId}
                onChange={(event) => setMovimientoStockForm({ ...movimientoStockForm, insumoId: event.target.value })}
                required
              >
                <option value="">Seleccionar insumo</option>
                {activeInsumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.nombre} ({formatStock(insumo.stockActual, insumo.unidadMedida)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tipo de movimiento</span>
              <select
                value={movimientoStockForm.tipoMovimiento}
                onChange={(event) =>
                  setMovimientoStockForm({
                    ...movimientoStockForm,
                    tipoMovimiento: event.target.value as MovimientoStockAlimentacionFormValues['tipoMovimiento'],
                  })
                }
                required
              >
                <option value="ENTRADA">Entrada</option>
                <option value="CONSUMO">Consumo</option>
                <option value="AJUSTE">Ajuste de stock final</option>
              </select>
            </label>
            <label>
              <span>{movimientoStockForm.tipoMovimiento === 'AJUSTE' ? 'Stock final' : 'Cantidad'}</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={movimientoStockForm.cantidad}
                onChange={(event) => setMovimientoStockForm({ ...movimientoStockForm, cantidad: event.target.value })}
                required
              />
            </label>
            <label>
              <span>Observaciones</span>
              <textarea
                value={movimientoStockForm.observaciones}
                onChange={(event) =>
                  setMovimientoStockForm({ ...movimientoStockForm, observaciones: event.target.value })
                }
                rows={4}
              />
            </label>
            <button type="submit" className="primary-button" disabled={isSaving || activeInsumos.length === 0}>
              <Boxes size={18} />
              {isSaving ? 'Registrando...' : 'Registrar movimiento'}
            </button>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Stock actual</h2>
            <p>{insumos.length} insumos cargados.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Unidad</th>
                <th>Stock actual</th>
                <th>Stock minimo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((insumo) => {
                const bajoStock = insumo.activo && insumo.stockActual <= insumo.stockMinimo;
                return (
                  <tr key={insumo.id} className={bajoStock ? 'stock-low-row' : undefined}>
                    <td><strong>{insumo.nombre}</strong><span>{insumo.descripcion || 'Sin descripcion'}</span></td>
                    <td>{insumo.unidadMedida}</td>
                    <td>{formatStock(insumo.stockActual, insumo.unidadMedida)}</td>
                    <td>{formatStock(insumo.stockMinimo, insumo.unidadMedida)}</td>
                    <td>
                      <span className={`status-pill ${bajoStock ? 'status-warning' : insumo.activo ? 'status-active' : 'status-inactive'}`}>
                        {!insumo.activo ? 'INACTIVO' : bajoStock ? 'BAJO STOCK' : 'NORMAL'}
                      </span>
                    </td>
                    <td>
                      {isAdmin && (
                        <div className="table-actions">
                          <button type="button" onClick={() => startEditingInsumo(insumo)} aria-label={`Editar ${insumo.nombre}`}>
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeactivateInsumo(insumo)}
                            disabled={!insumo.activo}
                            aria-label={`Dar de baja ${insumo.nombre}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {insumos.length === 0 && <tr><td colSpan={6}>Sin insumos cargados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Movimientos de stock</h2>
            <p>{movimientosStock.length} movimientos registrados.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Insumo</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {movimientosStock.map((movimiento) => (
                <tr key={movimiento.id}>
                  <td>{formatDate(movimiento.fecha)}</td>
                  <td>{movimiento.insumo.nombre}</td>
                  <td>{movimiento.tipoMovimiento}</td>
                  <td>{formatStock(movimiento.cantidad, movimiento.insumo.unidadMedida)}</td>
                  <td>{movimiento.usuario?.nombre ?? '-'}</td>
                  <td>{movimiento.observaciones || '-'}</td>
                </tr>
              ))}
              {movimientosStock.length === 0 && <tr><td colSpan={6}>Sin movimientos de stock.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Resumen por categoría</h2>
            <p>Kg entregados acumulados.</p>
          </div>
        </div>
        <div className="compact-bars">
          {(resumen?.alimentacionPorCategoria ?? []).map((item) => (
            <div className="compact-bar-row" key={item.categoriaAnimal}>
              <div className="compact-bar-label">
                <strong>{item.nombre}</strong>
                <span>{formatKg(item.totalKg)}</span>
              </div>
              <div className="compact-bar-track" aria-hidden="true">
                <span style={{ width: `${(item.totalKg / Math.max(maxKgByLote, 1)) * 100}%` }} />
              </div>
            </div>
          ))}
          {(!resumen || resumen.alimentacionPorCategoria.length === 0) && <p className="table-empty">Sin datos para mostrar.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historial de alimentacion</h2>
            <p>{registros.length} registros cargados.</p>
          </div>
        </div>
        {isLoading ? <p className="table-empty">Cargando alimentacion...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Racion</th>
                  <th>Kg</th>
                  <th>Usuario</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td>{formatDate(registro.fecha)}</td>
                    <td>{registro.categoriaAnimal}</td>
                    <td>{registro.racion.nombre}</td>
                    <td>{formatKg(registro.cantidadKg)}</td>
                    <td>{registro.usuario?.nombre ?? '-'}</td>
                    <td>{registro.observaciones || '-'}</td>
                  </tr>
                ))}
                {registros.length === 0 && <tr><td colSpan={6}>Sin registros de alimentacion.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
