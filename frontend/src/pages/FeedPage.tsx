import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Boxes, Eye, Package, Plus, RefreshCcw, Save, Search, Wheat, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import {
  crearMovimientoStock,
  getAlimentos,
  getHistorialAlimentacion,
  getMovimientosStock,
  getResumenAlimentacion,
  getSugerenciaAlimentacion,
  registrarAlimentacion,
} from '../services/alimentacionService';
import { getLotes } from '../services/lotesService';
import { AlimentosStockPanel } from '../components/ui/AlimentosStockPanel';
import { ReglasAlimentacionPanel } from '../components/ui/ReglasAlimentacionPanel';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { useScrollToSection } from '../hooks/useScrollToSection';
import { formatDate } from '../utils/display';
import type {
  AlimentacionResumen,
  Alimento,
  MovimientoStockAlimentacion,
  RegistroAlimentacion,
  SugerenciaAlimentacion,
} from '../types/alimentacion';
import type { AuthUser } from '../types/auth';
import type { Lote } from '../types/lotes';

interface FeedPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

type DetalleForm = SugerenciaAlimentacion['detalles'][number] & {
  cantidadReal: string;
  observaciones: string;
};

const today = new Date().toISOString().slice(0, 10);
const movimientoOptions = ['TODOS', 'ENTRADA', 'BAJA', 'CONSUMO', 'MODIFICACION'] as const;

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatStock(value: number, unidad: string) {
  return `${formatNumber(value)} ${unidad}`;
}

export function FeedPage({ authToken, currentUser, onUnauthorized }: FeedPageProps) {
  const [searchParams] = useSearchParams();
  const [resumen, setResumen] = useState<AlimentacionResumen | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoStockAlimentacion[]>([]);
  const [historial, setHistorial] = useState<RegistroAlimentacion[]>([]);
  const [sugerencia, setSugerencia] = useState<SugerenciaAlimentacion | null>(null);
  const [detalles, setDetalles] = useState<DetalleForm[]>([]);
  const [selectedDetalle, setSelectedDetalle] = useState<RegistroAlimentacion | null>(null);
  const [showRegistrarModal, setShowRegistrarModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [selectedAlimento, setSelectedAlimento] = useState<Alimento | null>(null);
  const [alimentoSearch, setAlimentoSearch] = useState('');
  const [fecha, setFecha] = useState(today);
  const [loteId, setLoteId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [movFilters, setMovFilters] = useState({ fechaDesde: '', fechaHasta: '', alimentoId: '', tipoMovimiento: 'TODOS', usuarioId: '' });
  const [histFilters, setHistFilters] = useState({ fechaDesde: '', fechaHasta: '', loteId: '', categoriaAnimal: '', usuarioId: '' });
  const [movimientoForm, setMovimientoForm] = useState({ tipoMovimiento: 'ENTRADA' as 'ENTRADA' | 'BAJA', cantidad: '', fecha: today, observaciones: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeLotes = useMemo(() => lotes.filter((lote) => lote.activo), [lotes]);
  const activeAlimentos = useMemo(() => alimentos.filter((alimento) => alimento.activo), [alimentos]);
  const isAdmin = currentUser?.role === 'ADMIN';
  const matchingAlimentos = useMemo(() => {
    const query = alimentoSearch.trim().toLowerCase();
    if (query.length < 2) return [];
    return activeAlimentos.filter((alimento) => alimento.nombre.toLowerCase().includes(query)).slice(0, 8);
  }, [activeAlimentos, alimentoSearch]);

  function handleRequestError(requestError: unknown, fallback = 'No se pudo completar la operación.') {
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
      const [nextResumen, nextLotes, nextAlimentos, nextMovimientos, nextHistorial] = await Promise.all([
        getResumenAlimentacion(authToken),
        getLotes(authToken),
        getAlimentos(authToken),
        isAdmin ? getMovimientosStock(authToken, movFilters) : Promise.resolve([]),
        getHistorialAlimentacion(authToken, histFilters),
      ]);
      setResumen(nextResumen);
      setLotes(nextLotes);
      setAlimentos(nextAlimentos);
      setMovimientos(nextMovimientos);
      setHistorial(nextHistorial);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar alimentación.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    if (searchParams.get('section') !== 'historial') return;
    setHistFilters((current) => ({
      ...current,
      fechaDesde: searchParams.get('fechaDesde') ?? current.fechaDesde,
      fechaHasta: searchParams.get('fechaHasta') ?? current.fechaHasta,
      usuarioId: searchParams.get('usuarioId') === 'me' ? String(currentUser?.id ?? '') : searchParams.get('usuarioId') ?? current.usuarioId,
    }));
  }, [currentUser?.id, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, histFilters, movFilters]);

  useDataChangedRefresh(() => loadData(), [authToken, histFilters, movFilters, isAdmin]);
  useScrollToSection(
    searchParams.get('section') === 'stock'
      ? 'stock-alimentos-section'
      : searchParams.get('section') === 'movimientos'
        ? 'movimientos-stock-section'
        : searchParams.get('section') === 'historial'
          ? 'historial-alimentacion-section'
          : null,
    [searchParams, historial.length, movimientos.length, alimentos.length],
  );

  function clearHistFilters() {
    const nextFilters = { fechaDesde: '', fechaHasta: '', loteId: '', categoriaAnimal: '', usuarioId: '' };
    setHistFilters(nextFilters);
  }

  function clearMovFilters() {
    const nextFilters = { fechaDesde: '', fechaHasta: '', alimentoId: '', tipoMovimiento: 'TODOS', usuarioId: '' };
    setMovFilters(nextFilters);
  }

  async function loadSugerencia(nextLoteId = loteId, nextFecha = fecha) {
    if (!authToken || !nextLoteId) {
      setSugerencia(null);
      setDetalles([]);
      return;
    }
    setError('');
    try {
      const next = await getSugerenciaAlimentacion(authToken, Number(nextLoteId), nextFecha);
      setSugerencia(next);
      setDetalles(next.detalles.map((detalle) => ({
        ...detalle,
        cantidadReal: detalle.cantidadSugeridaMaxima !== null ? String(Number(detalle.cantidadSugeridaMaxima.toFixed(2))) : '',
        observaciones: '',
      })));
    } catch (sugerenciaError) {
      handleRequestError(sugerenciaError, 'No se pudo calcular la sugerencia.');
    }
  }

  function resetRegistrarModal() {
    setShowRegistrarModal(false);
    setSugerencia(null);
    setDetalles([]);
    setFecha(today);
    setLoteId('');
    setObservaciones('');
    setError('');
  }

  function resetMovimientoModal() {
    setShowMovimientoModal(false);
    setSelectedAlimento(null);
    setAlimentoSearch('');
    setMovimientoForm({ tipoMovimiento: 'ENTRADA', cantidad: '', fecha: today, observaciones: '' });
    setError('');
  }

  async function handleRegistrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (!sugerencia?.categoriaPredominante) {
      setError('Seleccioná un lote con animales activos antes de guardar.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await registrarAlimentacion(authToken, {
        fecha,
        loteId: Number(loteId),
        categoriaAnimal: sugerencia.categoriaPredominante,
        cantidadAnimales: sugerencia.cantidadAnimales,
        observaciones: observaciones.trim() || null,
        detalles: detalles.map((detalle) => ({
          alimentoId: detalle.alimentoId,
          unidad: detalle.unidad,
          cantidadSugeridaMinima: detalle.cantidadSugeridaMinima,
          cantidadSugeridaMaxima: detalle.cantidadSugeridaMaxima,
          cantidadReal: Number(detalle.cantidadReal || 0),
          observaciones: detalle.observaciones.trim() || null,
        })),
      });
      resetRegistrarModal();
      setSuccess('Alimentación registrada correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar la alimentación.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMovimientoStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (!selectedAlimento) {
      setError('Seleccioná un alimento activo.');
      return;
    }
    const cantidad = Number(movimientoForm.cantidad || 0);
    if (movimientoForm.tipoMovimiento === 'BAJA' && cantidad > selectedAlimento.stockActual) {
      setError('La cantidad a dar de baja no puede superar el stock disponible.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await crearMovimientoStock(authToken, selectedAlimento.id, {
        tipoMovimiento: movimientoForm.tipoMovimiento,
        cantidad,
        fecha: movimientoForm.fecha,
        observaciones: movimientoForm.observaciones.trim() || null,
      });
      resetMovimientoModal();
      setSuccess('Movimiento de stock registrado correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar el movimiento.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Alimentación</h2>
          <p>Registro diario por lote, stock e historial operativo.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar alimentación">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="operative-summary-grid">
        <article className="metric-card operative-card"><div className="metric-icon metric-icon-blue"><Wheat size={20} /></div><p className="metric-title">Alimentaciones hoy</p><strong className="metric-value">{resumen?.alimentacionesRegistradasHoy ?? 0}</strong></article>
        <article className="metric-card operative-card"><div className="metric-icon metric-icon-emerald"><Boxes size={20} /></div><p className="metric-title">Lotes alimentados</p><strong className="metric-value">{resumen?.lotesAlimentadosHoy ?? 0}</strong></article>
        <article className="metric-card operative-card"><div className="metric-icon metric-icon-amber"><AlertTriangle size={20} /></div><p className="metric-title">Stock bajo</p><strong className="metric-value">{resumen?.insumosStockBajo ?? 0}</strong></article>
        <article className="metric-card operative-card"><div className="metric-icon metric-icon-indigo"><Package size={20} /></div><p className="metric-title">Agotados</p><strong className="metric-value">{resumen?.insumosAgotados ?? 0}</strong></article>
      </div>

      <section className="panel" id="historial-alimentacion-section">
        <div className="panel-header">
          <div><h2>Historial de alimentación</h2><p>{historial.length} alimentaciones registradas.</p></div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={() => setShowRegistrarModal(true)}><Plus size={16} /> Registrar alimentación</button>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar historial de alimentación"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <div className="filters-grid">
          <input type="date" value={histFilters.fechaDesde} onChange={(event) => setHistFilters({ ...histFilters, fechaDesde: event.target.value })} />
          <input type="date" value={histFilters.fechaHasta} onChange={(event) => setHistFilters({ ...histFilters, fechaHasta: event.target.value })} />
          <select value={histFilters.loteId} onChange={(event) => setHistFilters({ ...histFilters, loteId: event.target.value })}><option value="">Lote</option>{lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}</select>
          <input placeholder="Categoría" value={histFilters.categoriaAnimal} onChange={(event) => setHistFilters({ ...histFilters, categoriaAnimal: event.target.value })} />
          <input placeholder="Usuario ID" value={histFilters.usuarioId} onChange={(event) => setHistFilters({ ...histFilters, usuarioId: event.target.value })} />
          <button type="button" className="secondary-button" onClick={clearHistFilters}>Limpiar</button>
        </div>
        {isLoading ? <p className="table-empty">Cargando alimentación...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead><tr><th>Fecha</th><th>Lote</th><th>Categoría</th><th>Animales</th><th>Usuario</th><th>Total</th><th>Acciones</th></tr></thead>
              <tbody>
                {historial.map((registro) => <tr key={registro.id}><td>{formatDate(registro.fecha)}</td><td>{registro.lote?.nombre ?? '-'}</td><td>{registro.categoriaAnimal}</td><td>{registro.cantidadAnimales ?? '-'}</td><td>{registro.usuario?.nombre ?? '-'}</td><td>{registro.detalles.length} insumos</td><td><button type="button" className="icon-button" onClick={() => setSelectedDetalle(registro)} aria-label="Ver detalle"><Eye size={16} /></button></td></tr>)}
                {historial.length === 0 && <tr><td colSpan={7}>Sin registros de alimentación.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlimentosStockPanel
        authToken={authToken}
        onUnauthorized={onUnauthorized}
        onChanged={() => loadData()}
        isAdmin={isAdmin}
        initialStockFilter={
          searchParams.get('estadoStock') === 'CRITICO'
            ? 'CRITICO'
            : searchParams.get('estadoStock') === 'AGOTADO'
              ? 'AGOTADO'
              : searchParams.get('estadoStock') === 'BAJO'
                ? 'BAJO'
                : ''
        }
      />

      {isAdmin && <section className="panel" id="movimientos-stock-section">
        <div className="panel-header">
          <div><h2>Movimientos de stock</h2><p>{movimientos.length} movimientos encontrados.</p></div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={() => setShowMovimientoModal(true)}><Plus size={16} /> Registrar movimiento</button>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar movimientos de stock"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <div className="filters-grid">
          <input type="date" value={movFilters.fechaDesde} onChange={(event) => setMovFilters({ ...movFilters, fechaDesde: event.target.value })} />
          <input type="date" value={movFilters.fechaHasta} onChange={(event) => setMovFilters({ ...movFilters, fechaHasta: event.target.value })} />
          <select value={movFilters.alimentoId} onChange={(event) => setMovFilters({ ...movFilters, alimentoId: event.target.value })}><option value="">Alimento</option>{alimentos.map((alimento) => <option key={alimento.id} value={alimento.id}>{alimento.nombre}</option>)}</select>
          <select value={movFilters.tipoMovimiento} onChange={(event) => setMovFilters({ ...movFilters, tipoMovimiento: event.target.value })}>{movimientoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
          <input placeholder="Usuario ID" value={movFilters.usuarioId} onChange={(event) => setMovFilters({ ...movFilters, usuarioId: event.target.value })} />
          <button type="button" className="secondary-button" onClick={clearMovFilters}>Limpiar</button>
        </div>
        <div className="table-wrap">
          <table className="users-table">
            <thead><tr><th>Fecha</th><th>Insumo</th><th>Tipo</th><th>Cantidad</th><th>Unidad</th><th>Usuario</th><th>Observaciones</th></tr></thead>
            <tbody>
              {movimientos.map((movimiento) => <tr key={movimiento.id}><td>{formatDate(movimiento.fecha)}</td><td>{movimiento.insumo.nombre}</td><td>{movimiento.tipoMovimiento}</td><td>{formatNumber(movimiento.cantidad)}</td><td>{movimiento.insumo.unidadMedida}</td><td>{movimiento.usuario?.nombre ?? '-'}</td><td>{movimiento.observaciones || '-'}</td></tr>)}
              {movimientos.length === 0 && <tr><td colSpan={7}>Sin movimientos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      <ReglasAlimentacionPanel authToken={authToken} onUnauthorized={onUnauthorized} onChanged={() => loadData()} isAdmin={isAdmin} />

      {showRegistrarModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel modal-panel-wide feed-register-modal">
            <div className="panel-header"><div><h2>Registrar alimentación</h2><p>Lote diario con sugerencia calculada desde reglas activas.</p></div><button type="button" className="icon-button" onClick={resetRegistrarModal} aria-label="Cerrar"><X size={18} /></button></div>
            <form className="user-form feed-registration-form feed-register-form" onSubmit={handleRegistrar}>
              <label><span>Fecha</span><input type="date" value={fecha} onChange={(event) => { setFecha(event.target.value); void loadSugerencia(loteId, event.target.value); }} required /></label>
              <label><span>Lote</span><select value={loteId} onChange={(event) => { setLoteId(event.target.value); void loadSugerencia(event.target.value, fecha); }} required><option value="">Seleccionar lote</option>{activeLotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}</select></label>
              <label><span>Categoría predominante</span><input value={sugerencia?.categoriaPredominante ?? ''} readOnly /></label>
              <label><span>Cantidad de animales</span><input value={sugerencia?.cantidadAnimales ?? ''} readOnly /></label>
              <label><span>Responsable</span><input value={currentUser?.name ?? ''} readOnly /></label>
              <label className="form-wide"><span>Observaciones generales</span><textarea rows={2} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} /></label>
              {sugerencia?.advertencia && <div className="form-error form-wide">{sugerencia.advertencia}</div>}
              <div className="table-wrap form-wide">
                <table className="users-table">
                  <thead><tr><th>Alimento</th><th>Tipo</th><th>Unidad</th><th>Sug. mínima</th><th>Sug. máxima</th><th>Real entregada</th><th>Stock</th><th>Observaciones</th></tr></thead>
                  <tbody>
                    {detalles.map((detalle, index) => (
                      <tr key={detalle.reglaId}>
                        <td><strong>{detalle.alimento}</strong>{detalle.obligatorio && <span>Obligatorio</span>}</td>
                        <td>{detalle.tipoAlimento}</td>
                        <td>{detalle.unidad}</td>
                        <td>{formatStock(detalle.cantidadSugeridaMinima ?? 0, detalle.unidad)}</td>
                        <td>{formatStock(detalle.cantidadSugeridaMaxima ?? 0, detalle.unidad)}</td>
                        <td><input className="table-input" type="number" min="0" step="0.01" value={detalle.cantidadReal} onChange={(event) => setDetalles((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, cantidadReal: event.target.value } : item))} /></td>
                        <td>{formatStock(detalle.stockDisponible, detalle.unidad)}</td>
                        <td><input className="table-input" value={detalle.observaciones} onChange={(event) => setDetalles((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, observaciones: event.target.value } : item))} /></td>
                      </tr>
                    ))}
                    {detalles.length === 0 && <tr><td colSpan={8}>Seleccioná un lote para calcular la dieta sugerida.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={resetRegistrarModal}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving || detalles.length === 0}><Save size={18} />{isSaving ? 'Guardando...' : 'Registrar alimentación'}</button></div>
            </form>
          </section>
        </div>
      )}

      {showMovimientoModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel feed-movement-modal">
            <div className="panel-header"><div><h2>Registrar movimiento</h2><p>Alta o baja manual de stock.</p></div><button type="button" className="icon-button" onClick={resetMovimientoModal} aria-label="Cerrar"><X size={18} /></button></div>
            <form className="user-form feed-movement-form" onSubmit={handleMovimientoStock}>
              <label className="form-wide feed-autocomplete-field">
                <span>Alimento / insumo</span>
                <div className="search-input-wrapper">
                  <Search size={16} />
                  <input value={alimentoSearch} onChange={(event) => { setAlimentoSearch(event.target.value); setSelectedAlimento(null); }} placeholder="Buscar alimento por nombre..." />
                  {selectedAlimento && <button type="button" className="autocomplete-clear" onClick={() => { setSelectedAlimento(null); setAlimentoSearch(''); }} aria-label="Cambiar alimento"><X size={14} /></button>}
                </div>
                {!selectedAlimento && alimentoSearch.trim().length >= 2 && (
                  <div className="feed-autocomplete-results">
                    {matchingAlimentos.map((alimento) => (
                      <button type="button" key={alimento.id} onClick={() => { setSelectedAlimento(alimento); setAlimentoSearch(alimento.nombre); }}>
                        <strong>{alimento.nombre}</strong>
                        <span>{formatStock(alimento.stockActual, alimento.unidadMedida)}</span>
                      </button>
                    ))}
                    {matchingAlimentos.length === 0 && <p>Sin coincidencias activas.</p>}
                  </div>
                )}
              </label>
              <label><span>Tipo de movimiento</span><select value={movimientoForm.tipoMovimiento} onChange={(event) => setMovimientoForm({ ...movimientoForm, tipoMovimiento: event.target.value as 'ENTRADA' | 'BAJA' })}><option value="ENTRADA">ALTA / ENTRADA</option><option value="BAJA">BAJA_MANUAL / BAJA</option></select></label>
              <label><span>Cantidad</span><input type="number" min="0.01" step="0.01" value={movimientoForm.cantidad} onChange={(event) => setMovimientoForm({ ...movimientoForm, cantidad: event.target.value })} required /></label>
              <label><span>Fecha</span><input type="date" value={movimientoForm.fecha} onChange={(event) => setMovimientoForm({ ...movimientoForm, fecha: event.target.value })} required /></label>
              <label className="form-wide"><span>Observaciones</span><textarea rows={3} value={movimientoForm.observaciones} onChange={(event) => setMovimientoForm({ ...movimientoForm, observaciones: event.target.value })} placeholder="Mal estado, vencimiento, pérdida, humedad, rotura o ajuste por inventario" /></label>
              {selectedAlimento && <div className="form-success form-wide">Seleccionado: {selectedAlimento.nombre} · stock disponible {formatStock(selectedAlimento.stockActual, selectedAlimento.unidadMedida)}</div>}
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={resetMovimientoModal}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving || !selectedAlimento}><Save size={18} />{isSaving ? 'Guardando...' : 'Guardar movimiento'}</button></div>
            </form>
          </section>
        </div>
      )}

      {selectedDetalle && (
        <div className="modal-backdrop">
          <section className="panel modal-panel modal-panel-wide">
            <div className="panel-header"><div><h2>Detalle de alimentación</h2><p>{formatDate(selectedDetalle.fecha)} · {selectedDetalle.lote?.nombre ?? '-'}</p></div><button type="button" className="icon-button" onClick={() => setSelectedDetalle(null)} aria-label="Cerrar"><X size={18} /></button></div>
            <div className="table-wrap">
              <table className="users-table">
                <thead><tr><th>Alimento</th><th>Sug. mínima</th><th>Sug. máxima</th><th>Real entregada</th><th>Unidad</th><th>Observaciones</th></tr></thead>
                <tbody>{selectedDetalle.detalles.map((detalle) => <tr key={detalle.id}><td>{detalle.insumo.nombre}</td><td>{formatNumber(detalle.cantidadSugeridaMinima)}</td><td>{formatNumber(detalle.cantidadSugeridaMaxima)}</td><td>{formatNumber(detalle.cantidad)}</td><td>{detalle.unidad}</td><td>{detalle.observaciones || '-'}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
