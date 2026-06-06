import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Eye, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getClientes } from '../services/clientesService';
import { createVenta, getLotesDisponiblesVenta, getVenta, getVentas } from '../services/ventasService';
import type { AuthUser } from '../types/auth';
import type { Cliente } from '../types/clientes';
import type { LoteLecheDisponible, Venta, VentaDetalleFormValues, VentaFilters, VentaFormValues } from '../types/ventas';

const duplicateLoteMessage = 'No se puede seleccionar el mismo lote más de una vez en la misma venta.';

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const emptyDetail: VentaDetalleFormValues = {
  loteLecheId: '',
  litrosVendidos: '',
};

const emptyForm: VentaFormValues = {
  clienteId: '',
  numeroFactura: '',
  fechaVenta: localDateValue(),
  precioPorLitro: '',
  observaciones: '',
  detalles: [{ ...emptyDetail }],
};

const emptyFilters: VentaFilters = {
  clienteId: '',
  clienteSearch: '',
  fechaDesde: '',
  fechaHasta: '',
  factura: '',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR');
}

function formatLiters(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} l`;
}

function formatCurrency(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function clienteLabel(cliente: Cliente) {
  return `${cliente.cuit} - ${cliente.razonSocial}`;
}

interface SalesPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function SalesPage({ authToken, onUnauthorized }: SalesPageProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [lotesLeche, setLotesLeche] = useState<LoteLecheDisponible[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [form, setForm] = useState<VentaFormValues>(emptyForm);
  const [filters, setFilters] = useState<VentaFilters>(emptyFilters);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const lotesVendibles = useMemo(
    () => lotesLeche.filter((lote) => lote.estadoCalculado === 'DISPONIBLE' && Number(lote.litrosDisponibles) > 0),
    [lotesLeche],
  );
  const selectedLoteIds = useMemo(() => form.detalles.map((detalle) => detalle.loteLecheId).filter(Boolean), [form.detalles]);
  const hasDuplicateLotes = useMemo(() => new Set(selectedLoteIds).size !== selectedLoteIds.length, [selectedLoteIds]);
  const precioPorLitro = Number(form.precioPorLitro || 0);
  const clienteQuery = clienteSearch.trim();
  const showClienteDropdown = !selectedCliente && clienteQuery.length >= 2;
  const totals = useMemo(
    () =>
      form.detalles.reduce(
        (total, detalle) => {
          const litros = Number(detalle.litrosVendidos || 0);
          return { litros: total.litros + litros, importe: total.importe + litros * precioPorLitro };
        },
        { litros: 0, importe: 0 },
      ),
    [form.detalles, precioPorLitro],
  );

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  async function loadData(nextFilters = filters, nextClienteSearch = clienteSearch) {
    if (!authToken) return;
    setIsLoading(true);
    setError('');
    try {
      const [nextClientes, nextLotes, nextVentas] = await Promise.all([
        getClientes(authToken, nextClienteSearch, true),
        getLotesDisponiblesVenta(authToken),
        getVentas(authToken, nextFilters),
      ]);
      setClientes(nextClientes);
      setLotesLeche(nextLotes);
      setVentas(nextVentas);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar ventas.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    const search = clienteSearch.trim();
    if (!authToken || selectedCliente) return;
    if (search.length < 2) {
      setClientes([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void getClientes(authToken, search, true)
          .then(setClientes)
          .catch((loadError) => handleRequestError(loadError, 'No se pudieron cargar clientes.'));
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, clienteSearch, selectedCliente]);

  function selectCliente(cliente: Cliente) {
    setSelectedCliente(cliente);
    setClienteSearch(clienteLabel(cliente));
    setForm((current) => ({ ...current, clienteId: String(cliente.id) }));
  }

  function clearCliente() {
    setSelectedCliente(null);
    setClienteSearch('');
    setForm((current) => ({ ...current, clienteId: '' }));
  }

  function updateDetail(index: number, next: Partial<VentaDetalleFormValues>) {
    setForm((current) => ({
      ...current,
      detalles: current.detalles.map((detalle, currentIndex) => (currentIndex === index ? { ...detalle, ...next } : detalle)),
    }));
  }

  function removeDetail(index: number) {
    setForm((current) => ({
      ...current,
      detalles: current.detalles.length === 1 ? current.detalles : current.detalles.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function loteOptionsForRow(currentValue: string) {
    const usedByOtherRows = new Set(selectedLoteIds.filter((id) => id !== currentValue));
    return lotesVendibles.filter((lote) => String(lote.id) === currentValue || !usedByOtherRows.has(String(lote.id)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (hasDuplicateLotes) {
      setError(duplicateLoteMessage);
      return;
    }
    if (!form.clienteId) {
      setError('Debe seleccionar un cliente activo.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await createVenta(authToken, form);
      setForm({ ...emptyForm, fechaVenta: localDateValue(), detalles: [{ ...emptyDetail }] });
      setClienteSearch('');
      setSelectedCliente(null);
      setSuccess('Venta registrada correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar la venta.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadData(filters);
  }

  async function openVenta(venta: Venta) {
    if (!authToken) return onUnauthorized();
    setSelectedVenta(null);
    setError('');
    try {
      setSelectedVenta(await getVenta(authToken, venta.id));
    } catch (detailError) {
      handleRequestError(detailError, 'No se pudo cargar el detalle de la venta.');
    }
  }

  function loteLabel(lote: LoteLecheDisponible) {
    return `${lote.codigo} - disponible ${formatLiters(lote.litrosDisponibles)}`;
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Ventas</h2>
          <p>Venta de leche por cliente, factura y lotes de producción.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar ventas">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      {hasDuplicateLotes && <div className="form-warning">{duplicateLoteMessage}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Nueva venta</h2>
            <p>Una factura puede tomar litros de uno o varios lotes de leche.</p>
          </div>
        </div>
        <form className="user-form production-form" onSubmit={handleSubmit}>
          <label className="client-search-field">
            <span>Cliente</span>
            <input
              placeholder="Buscar cliente por CUIT o razón social..."
              value={clienteSearch}
              onChange={(event) => {
                setClienteSearch(event.target.value);
                setSelectedCliente(null);
                setForm((current) => ({ ...current, clienteId: '' }));
              }}
              autoComplete="off"
            />
            {selectedCliente ? (
              <div className="client-selection">
                <strong>{clienteLabel(selectedCliente)}</strong>
                <button type="button" className="secondary-button" onClick={clearCliente}>Limpiar</button>
              </div>
            ) : showClienteDropdown ? (
              <div className="client-results">
                {clientes.map((cliente) => (
                  <button type="button" key={cliente.id} onClick={() => selectCliente(cliente)}>
                    {clienteLabel(cliente)}
                  </button>
                ))}
                {clientes.length === 0 && <p>No se encontraron clientes activos</p>}
              </div>
            ) : (
              null
            )}
          </label>
          <label>
            <span>Número de factura</span>
            <input value={form.numeroFactura} onChange={(event) => setForm({ ...form, numeroFactura: event.target.value })} required />
          </label>
          <label>
            <span>Fecha de venta</span>
            <input type="date" value={form.fechaVenta} onChange={(event) => setForm({ ...form, fechaVenta: event.target.value })} required />
          </label>
          <label>
            <span>Precio por litro</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.precioPorLitro}
              onChange={(event) => setForm({ ...form, precioPorLitro: event.target.value })}
              required
            />
          </label>
          <label className="production-wide-field">
            <span>Observaciones</span>
            <textarea rows={2} value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} />
          </label>

          <div className="production-wide-field table-wrap">
            <table className="users-table">
              <thead>
                <tr><th>Lote de leche</th><th>Litros disponibles</th><th>Litros vendidos</th><th>Subtotal</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {form.detalles.map((detalle, index) => {
                  const lote = lotesLeche.find((item) => String(item.id) === detalle.loteLecheId);
                  const subtotal = Number(detalle.litrosVendidos || 0) * precioPorLitro;
                  return (
                    <tr key={`${index}-${detalle.loteLecheId || 'nuevo'}`}>
                      <td>
                        <select value={detalle.loteLecheId} onChange={(event) => updateDetail(index, { loteLecheId: event.target.value })} required>
                          <option value="">Seleccionar lote</option>
                          {loteOptionsForRow(detalle.loteLecheId).map((option) => <option key={option.id} value={option.id}>{loteLabel(option)}</option>)}
                        </select>
                      </td>
                      <td>{lote ? formatLiters(lote.litrosDisponibles) : '-'}</td>
                      <td>
                        <input
                          type="number"
                          min="0.01"
                          max={lote ? Number(lote.litrosDisponibles).toFixed(2) : undefined}
                          step="0.01"
                          value={detalle.litrosVendidos}
                          onChange={(event) => updateDetail(index, { litrosVendidos: event.target.value })}
                          required
                        />
                      </td>
                      <td><strong>{formatCurrency(subtotal)}</strong></td>
                      <td>
                        <button type="button" className="icon-button" onClick={() => removeDetail(index)} aria-label="Quitar lote">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="production-wide-field selected-animals-summary">
            <button type="button" className="secondary-button" onClick={() => setForm({ ...form, detalles: [...form.detalles, { ...emptyDetail }] })}>
              <Plus size={16} />Agregar lote
            </button>
            <span className="lineage-chip">Total litros: {formatLiters(totals.litros)}</span>
            <span className="lineage-chip">Precio por litro: {formatCurrency(precioPorLitro)}</span>
            <span className="lineage-chip">Importe: {formatCurrency(totals.importe)}</span>
          </div>
          <button
            type="submit"
            className="primary-button production-wide-field"
            disabled={isSaving || !form.clienteId || lotesVendibles.length === 0 || precioPorLitro <= 0 || hasDuplicateLotes}
          >
            <Save size={18} />Registrar venta
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Historial de ventas</h2><p>{ventas.length} ventas encontradas.</p></div></div>
        <form className="filters-form events-filters production-filters" onSubmit={handleFilters}>
          <label className="filter-field">
            <span>Cliente</span>
            <input
              placeholder="Buscar ventas por CUIT o razón social..."
              value={filters.clienteSearch}
              onChange={(event) => setFilters({ ...filters, clienteSearch: event.target.value, clienteId: '' })}
            />
          </label>
          <label className="filter-field"><span>Fecha desde</span><input type="date" value={filters.fechaDesde} onChange={(event) => setFilters({ ...filters, fechaDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha hasta</span><input type="date" value={filters.fechaHasta} onChange={(event) => setFilters({ ...filters, fechaHasta: event.target.value })} /></label>
          <label className="filter-field"><span>Factura</span><input value={filters.factura} onChange={(event) => setFilters({ ...filters, factura: event.target.value })} /></label>
          <button type="submit" className="secondary-button">Filtrar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando ventas...</p> : (
          <div className="table-wrap">
            <table className="users-table production-history-table">
              <thead><tr><th>Fecha</th><th>Factura</th><th>Cliente</th><th>CUIT</th><th>Total litros</th><th>Precio por litro</th><th>Precio total</th><th>Usuario</th><th>Detalle</th></tr></thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td>{formatDate(venta.fechaVenta)}</td>
                    <td><strong>{venta.numeroFactura}</strong></td>
                    <td>{venta.cliente.razonSocial}</td>
                    <td>{venta.cliente.cuit}</td>
                    <td>{formatLiters(venta.totalLitros)}</td>
                    <td>{formatCurrency(venta.precioPorLitro)}</td>
                    <td><strong>{formatCurrency(venta.precioTotal)}</strong></td>
                    <td>{venta.usuario?.nombre ?? '-'}</td>
                    <td><button type="button" className="icon-button" onClick={() => void openVenta(venta)} aria-label="Ver detalle de venta"><Eye size={16} /></button></td>
                  </tr>
                ))}
                {ventas.length === 0 && <tr><td colSpan={9}>Sin ventas registradas.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedVenta && (
        <div className="modal-backdrop">
          <div className="modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Factura {selectedVenta.numeroFactura}</h2>
                <p>{selectedVenta.cliente.razonSocial} / {formatDate(selectedVenta.fechaVenta)}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedVenta(null)} aria-label="Cerrar detalle"><X size={18} /></button>
            </div>
            <div className="dashboard-kpi-grid production-stats-grid">
              <article className="dashboard-kpi-card dashboard-kpi-emerald"><strong>Total litros</strong><h3>{formatLiters(selectedVenta.totalLitros)}</h3></article>
              <article className="dashboard-kpi-card dashboard-kpi-blue"><strong>Precio por litro</strong><h3>{formatCurrency(selectedVenta.precioPorLitro)}</h3></article>
              <article className="dashboard-kpi-card dashboard-kpi-indigo"><strong>Precio total</strong><h3>{formatCurrency(selectedVenta.precioTotal)}</h3></article>
              <article className="dashboard-kpi-card dashboard-kpi-emerald"><strong>Usuario</strong><h3>{selectedVenta.usuario?.nombre ?? '-'}</h3></article>
            </div>
            <div className="table-wrap feed-table-wrap">
              <table className="users-table">
                <thead><tr><th>Lote</th><th>Litros vendidos</th><th>Precio unitario usado</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {selectedVenta.detalles.map((detalle) => (
                    <tr key={detalle.id}>
                      <td><strong>{detalle.loteLeche.codigo}</strong><span>{detalle.loteLeche.descripcion || '-'}</span></td>
                      <td>{formatLiters(detalle.litrosVendidos)}</td>
                      <td>{formatCurrency(detalle.precioUnitario)}</td>
                      <td><strong>{formatCurrency(detalle.subtotal)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
