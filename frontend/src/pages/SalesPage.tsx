import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Eye, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { createCliente, getCliente, getClientes, updateCliente, updateClienteEstado } from '../services/clientesService';
import { createVenta, getLotesDisponiblesVenta, getVenta, getVentas } from '../services/ventasService';
import type { AuthUser } from '../types/auth';
import type { Cliente, ClienteCreateValues, ClienteDetalle, ClienteEditValues } from '../types/clientes';
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

const emptyVentaForm: VentaFormValues = {
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

const emptyClienteCreateForm: ClienteCreateValues = {
  cuit: '',
  razonSocial: '',
  direccion: '',
  telefono: '',
  email: '',
};

function editValuesFromCliente(cliente: Cliente): ClienteEditValues {
  return {
    direccion: cliente.direccion ?? '',
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',
    activo: cliente.activo,
  };
}

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

export function SalesPage({ authToken, currentUser, onUnauthorized }: SalesPageProps) {
  const [ventaClientes, setVentaClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [lotesLeche, setLotesLeche] = useState<LoteLecheDisponible[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [ventaForm, setVentaForm] = useState<VentaFormValues>(emptyVentaForm);
  const [filters, setFilters] = useState<VentaFilters>(emptyFilters);
  const [showVentaModal, setShowVentaModal] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesSearch, setClientesSearch] = useState('');
  const [clienteCreateForm, setClienteCreateForm] = useState<ClienteCreateValues>(emptyClienteCreateForm);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [clienteEditForm, setClienteEditForm] = useState<ClienteEditValues | null>(null);
  const [selectedClienteDetalle, setSelectedClienteDetalle] = useState<ClienteDetalle | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSalesLoading, setIsSalesLoading] = useState(false);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const lotesVendibles = useMemo(
    () => lotesLeche.filter((lote) => lote.estadoCalculado === 'DISPONIBLE' && Number(lote.litrosDisponibles) > 0),
    [lotesLeche],
  );
  const selectedLoteIds = useMemo(() => ventaForm.detalles.map((detalle) => detalle.loteLecheId).filter(Boolean), [ventaForm.detalles]);
  const hasDuplicateLotes = useMemo(() => new Set(selectedLoteIds).size !== selectedLoteIds.length, [selectedLoteIds]);
  const precioPorLitro = Number(ventaForm.precioPorLitro || 0);
  const clienteQuery = clienteSearch.trim();
  const showClienteDropdown = !selectedCliente && clienteQuery.length >= 2;
  const totals = useMemo(
    () =>
      ventaForm.detalles.reduce(
        (total, detalle) => {
          const litros = Number(detalle.litrosVendidos || 0);
          return { litros: total.litros + litros, importe: total.importe + litros * precioPorLitro };
        },
        { litros: 0, importe: 0 },
      ),
    [ventaForm.detalles, precioPorLitro],
  );

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  async function loadSalesData(nextFilters = filters) {
    if (!authToken) return;
    setIsSalesLoading(true);
    setError('');
    try {
      const [nextLotes, nextVentas] = await Promise.all([
        getLotesDisponiblesVenta(authToken),
        getVentas(authToken, nextFilters),
      ]);
      setLotesLeche(nextLotes);
      setVentas(nextVentas);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar ventas.');
    } finally {
      setIsSalesLoading(false);
    }
  }

  async function loadClientes(nextSearch = clientesSearch) {
    if (!authToken) return;
    setIsClientsLoading(true);
    setError('');
    try {
      setClientes(await getClientes(authToken, nextSearch));
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudieron cargar los clientes.');
    } finally {
      setIsClientsLoading(false);
    }
  }

  useEffect(() => {
    void loadSalesData();
    void loadClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    const search = clienteSearch.trim();
    if (!authToken || selectedCliente || !showVentaModal) return;
    if (search.length < 2) {
      setVentaClientes([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void getClientes(authToken, search, true)
        .then(setVentaClientes)
        .catch((loadError) => handleRequestError(loadError, 'No se pudieron cargar clientes.'));
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, clienteSearch, selectedCliente, showVentaModal]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadClientes(clientesSearch), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, clientesSearch]);

  function resetVentaForm() {
    setVentaForm({ ...emptyVentaForm, fechaVenta: localDateValue(), detalles: [{ ...emptyDetail }] });
    setClienteSearch('');
    setSelectedCliente(null);
    setVentaClientes([]);
  }

  function openVentaModal() {
    resetVentaForm();
    setShowVentaModal(true);
    setError('');
    setSuccess('');
  }

  function closeVentaModal() {
    setShowVentaModal(false);
    resetVentaForm();
  }

  function openClienteModal() {
    setClienteCreateForm(emptyClienteCreateForm);
    setShowClienteModal(true);
    setError('');
    setSuccess('');
  }

  function closeClienteModal() {
    setShowClienteModal(false);
    setClienteCreateForm(emptyClienteCreateForm);
  }

  function selectCliente(cliente: Cliente) {
    setSelectedCliente(cliente);
    setClienteSearch(clienteLabel(cliente));
    setVentaForm((current) => ({ ...current, clienteId: String(cliente.id) }));
  }

  function clearCliente() {
    setSelectedCliente(null);
    setClienteSearch('');
    setVentaForm((current) => ({ ...current, clienteId: '' }));
  }

  function updateDetail(index: number, next: Partial<VentaDetalleFormValues>) {
    setVentaForm((current) => ({
      ...current,
      detalles: current.detalles.map((detalle, currentIndex) => (currentIndex === index ? { ...detalle, ...next } : detalle)),
    }));
  }

  function removeDetail(index: number) {
    setVentaForm((current) => ({
      ...current,
      detalles: current.detalles.length === 1 ? current.detalles : current.detalles.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function loteOptionsForRow(currentValue: string) {
    const usedByOtherRows = new Set(selectedLoteIds.filter((id) => id !== currentValue));
    return lotesVendibles.filter((lote) => String(lote.id) === currentValue || !usedByOtherRows.has(String(lote.id)));
  }

  async function handleVentaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (hasDuplicateLotes) {
      setError(duplicateLoteMessage);
      return;
    }
    if (!ventaForm.clienteId) {
      setError('Debe seleccionar un cliente activo.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await createVenta(authToken, ventaForm);
      closeVentaModal();
      setSuccess('Venta registrada correctamente.');
      await loadSalesData(filters);
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar la venta.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadSalesData(filters);
  }

  async function handleClienteCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await createCliente(authToken, clienteCreateForm);
      closeClienteModal();
      setSuccess('Cliente creado correctamente.');
      await loadClientes();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo crear el cliente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClienteEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (!editingCliente || !clienteEditForm) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateCliente(authToken, editingCliente.id, clienteEditForm);
      setEditingCliente(null);
      setClienteEditForm(null);
      setSuccess('Cliente actualizado correctamente.');
      await loadClientes();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo actualizar el cliente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClienteBaja(cliente: Cliente) {
    if (!authToken) return onUnauthorized();
    if (!window.confirm('¿Deseás dar de baja este cliente?')) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateClienteEstado(authToken, cliente.id, false);
      setSuccess('Cliente dado de baja correctamente.');
      await loadClientes();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo dar de baja el cliente.');
    } finally {
      setIsSaving(false);
    }
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

  async function openClienteDetalle(cliente: Cliente) {
    if (!authToken) return onUnauthorized();
    setSelectedClienteDetalle(null);
    setError('');
    try {
      setSelectedClienteDetalle(await getCliente(authToken, cliente.id));
    } catch (detailError) {
      handleRequestError(detailError, 'No se pudo cargar el detalle del cliente.');
    }
  }

  function startEditingCliente(cliente: Cliente) {
    setEditingCliente(cliente);
    setClienteEditForm(editValuesFromCliente(cliente));
    setError('');
    setSuccess('');
  }

  function loteLabel(lote: LoteLecheDisponible) {
    return `${lote.codigo} - disponible ${formatLiters(lote.litrosDisponibles)}`;
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Ventas</h2>
          <p>Historial comercial, nueva venta y clientes compradores.</p>
        </div>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      {hasDuplicateLotes && showVentaModal && <div className="form-warning">{duplicateLoteMessage}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historial de ventas</h2>
            <p>{ventas.length} ventas encontradas.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={openVentaModal}>
              <Plus size={16} />Nueva venta
            </button>
            <button type="button" className="icon-button" onClick={() => void loadSalesData()} aria-label="Actualizar ventas">
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>
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
        {isSalesLoading ? <p className="table-empty">Cargando ventas...</p> : (
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

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Listado de clientes</h2>
            <p>{clientes.length} clientes encontrados.</p>
          </div>
          <div className="header-actions">
            {isAdmin && <button type="button" className="secondary-button" onClick={openClienteModal}><Plus size={16} />Nuevo cliente</button>}
            <button type="button" className="icon-button" onClick={() => void loadClientes()} aria-label="Actualizar clientes"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <label className="filter-field production-selector">
          <span>Buscar</span>
          <input
            placeholder="Buscar por CUIT o razón social..."
            value={clientesSearch}
            onChange={(event) => setClientesSearch(event.target.value)}
          />
        </label>
        {isClientsLoading ? <p className="table-empty">Cargando clientes...</p> : (
          <div className="table-wrap feed-table-wrap">
            <table className="users-table">
              <thead><tr><th>CUIT</th><th>Razón social</th><th>Dirección</th><th>Teléfono</th><th>Email</th><th>Fecha alta</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td><strong>{cliente.cuit}</strong></td>
                    <td>{cliente.razonSocial}</td>
                    <td>{cliente.direccion || '-'}</td>
                    <td>{cliente.telefono || '-'}</td>
                    <td>{cliente.email || '-'}</td>
                    <td>{formatDate(cliente.fechaAlta)}</td>
                    <td><span className={`status-pill ${cliente.activo ? 'status-active' : 'status-inactive'}`}>{cliente.activo ? 'ACTIVO' : 'INACTIVO'}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => void openClienteDetalle(cliente)} aria-label={`Ver detalle de ${cliente.razonSocial}`}><Eye size={16} /></button>
                        {isAdmin && <button type="button" onClick={() => startEditingCliente(cliente)} aria-label={`Editar ${cliente.razonSocial}`}><Edit2 size={16} /></button>}
                        {isAdmin && cliente.activo && (
                          <button type="button" onClick={() => void handleClienteBaja(cliente)} aria-label={`Dar de baja ${cliente.razonSocial}`}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {clientes.length === 0 && <tr><td colSpan={8}>Sin clientes cargados.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showVentaModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel modal-panel-wide animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Nueva venta</h2>
                <p>Una factura puede tomar litros de uno o varios lotes de leche.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeVentaModal} aria-label="Cerrar nueva venta"><X size={18} /></button>
            </div>
            <form className="user-form production-form" onSubmit={handleVentaSubmit}>
              <label className="client-search-field">
                <span>Cliente</span>
                <input
                  placeholder="Buscar cliente por CUIT o razón social..."
                  value={clienteSearch}
                  onChange={(event) => {
                    setClienteSearch(event.target.value);
                    setSelectedCliente(null);
                    setVentaForm((current) => ({ ...current, clienteId: '' }));
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
                    {ventaClientes.map((cliente) => (
                      <button type="button" key={cliente.id} onClick={() => selectCliente(cliente)}>
                        {clienteLabel(cliente)}
                      </button>
                    ))}
                    {ventaClientes.length === 0 && <p>No se encontraron clientes activos</p>}
                  </div>
                ) : null}
              </label>
              <label><span>Número de factura</span><input value={ventaForm.numeroFactura} onChange={(event) => setVentaForm({ ...ventaForm, numeroFactura: event.target.value })} required /></label>
              <label><span>Fecha de venta</span><input type="date" value={ventaForm.fechaVenta} onChange={(event) => setVentaForm({ ...ventaForm, fechaVenta: event.target.value })} required /></label>
              <label>
                <span>Precio por litro</span>
                <input type="number" min="0.01" step="0.01" value={ventaForm.precioPorLitro} onChange={(event) => setVentaForm({ ...ventaForm, precioPorLitro: event.target.value })} required />
              </label>
              <label className="production-wide-field"><span>Observaciones</span><textarea rows={2} value={ventaForm.observaciones} onChange={(event) => setVentaForm({ ...ventaForm, observaciones: event.target.value })} /></label>

              <div className="production-wide-field table-wrap">
                <table className="users-table">
                  <thead><tr><th>Lote de leche</th><th>Litros disponibles</th><th>Litros vendidos</th><th>Subtotal</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {ventaForm.detalles.map((detalle, index) => {
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
                          <td><button type="button" className="icon-button" onClick={() => removeDetail(index)} aria-label="Quitar lote"><Trash2 size={16} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="production-wide-field selected-animals-summary">
                <button type="button" className="secondary-button" onClick={() => setVentaForm({ ...ventaForm, detalles: [...ventaForm.detalles, { ...emptyDetail }] })}>
                  <Plus size={16} />Agregar lote
                </button>
                <span className="lineage-chip">Total litros: {formatLiters(totals.litros)}</span>
                <span className="lineage-chip">Precio por litro: {formatCurrency(precioPorLitro)}</span>
                <span className="lineage-chip">Importe: {formatCurrency(totals.importe)}</span>
              </div>
              <div className="modal-actions production-wide-field">
                <button type="button" className="secondary-button" onClick={closeVentaModal}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving || !ventaForm.clienteId || lotesVendibles.length === 0 || precioPorLitro <= 0 || hasDuplicateLotes}>
                  <Save size={18} />Registrar venta
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showClienteModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Nuevo cliente</h2>
                <p>CUIT y razón social quedan fijos al crear.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeClienteModal} aria-label="Cerrar nuevo cliente"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleClienteCreate}>
              <label><span>CUIT</span><input value={clienteCreateForm.cuit} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, cuit: event.target.value })} required /></label>
              <label><span>Razón social / nombre</span><input value={clienteCreateForm.razonSocial} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, razonSocial: event.target.value })} required /></label>
              <label><span>Dirección</span><input value={clienteCreateForm.direccion} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, direccion: event.target.value })} /></label>
              <label><span>Teléfono</span><input value={clienteCreateForm.telefono} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, telefono: event.target.value })} /></label>
              <label><span>Email</span><input type="email" value={clienteCreateForm.email} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, email: event.target.value })} /></label>
              <div className="modal-actions animal-form-actions">
                <button type="button" className="secondary-button" onClick={closeClienteModal}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Save size={18} />Guardar cliente</button>
              </div>
            </form>
          </section>
        </div>
      )}

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

      {selectedClienteDetalle && (
        <div className="modal-backdrop">
          <div className="modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>{selectedClienteDetalle.razonSocial}</h2>
                <p>Detalle y trazabilidad comercial.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedClienteDetalle(null)} aria-label="Cerrar detalle"><X size={18} /></button>
            </div>
            <div className="info-grid">
              <div className="info-item"><span>CUIT</span><strong>{selectedClienteDetalle.cuit}</strong></div>
              <div className="info-item"><span>Razón social</span><strong>{selectedClienteDetalle.razonSocial}</strong></div>
              <div className="info-item"><span>Dirección</span><strong>{selectedClienteDetalle.direccion || '-'}</strong></div>
              <div className="info-item"><span>Teléfono</span><strong>{selectedClienteDetalle.telefono || '-'}</strong></div>
              <div className="info-item"><span>Email</span><strong>{selectedClienteDetalle.email || '-'}</strong></div>
              <div className="info-item"><span>Fecha alta</span><strong>{formatDate(selectedClienteDetalle.fechaAlta)}</strong></div>
              <div className="info-item"><span>Estado</span><strong>{selectedClienteDetalle.activo ? 'Activo' : 'Inactivo'}</strong></div>
              <div className="info-item"><span>Ventas</span><strong>{selectedClienteDetalle.resumen.cantidadVentas}</strong></div>
              <div className="info-item"><span>Total litros comprados</span><strong>{formatLiters(selectedClienteDetalle.resumen.litrosComprados)}</strong></div>
              <div className="info-item"><span>Importe total comprado</span><strong>{formatCurrency(selectedClienteDetalle.resumen.importeTotalComprado)}</strong></div>
            </div>
            <div className="table-wrap feed-table-wrap">
              <table className="users-table">
                <thead><tr><th>Fecha</th><th>Factura</th><th>Litros</th><th>Importe</th></tr></thead>
                <tbody>
                  {selectedClienteDetalle.ventas.map((venta) => (
                    <tr key={venta.id}>
                      <td>{formatDate(venta.fechaVenta)}</td>
                      <td><strong>{venta.numeroFactura}</strong></td>
                      <td>{formatLiters(venta.totalLitros)}</td>
                      <td>{formatCurrency(venta.precioTotal)}</td>
                    </tr>
                  ))}
                  {selectedClienteDetalle.ventas.length === 0 && <tr><td colSpan={4}>Sin ventas asociadas.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingCliente && clienteEditForm && (
        <div className="modal-backdrop">
          <div className="modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Editar cliente</h2>
                <p>{editingCliente.razonSocial}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setEditingCliente(null)} aria-label="Cerrar edición"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleClienteEdit}>
              <label><span>CUIT</span><input value={editingCliente.cuit} readOnly /></label>
              <label><span>Razón social</span><input value={editingCliente.razonSocial} readOnly /></label>
              <label><span>Fecha alta</span><input value={formatDate(editingCliente.fechaAlta)} readOnly /></label>
              <label><span>Estado</span><select value={String(clienteEditForm.activo)} onChange={(event) => setClienteEditForm({ ...clienteEditForm, activo: event.target.value === 'true' })}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
              <label><span>Dirección</span><input value={clienteEditForm.direccion} onChange={(event) => setClienteEditForm({ ...clienteEditForm, direccion: event.target.value })} /></label>
              <label><span>Teléfono</span><input value={clienteEditForm.telefono} onChange={(event) => setClienteEditForm({ ...clienteEditForm, telefono: event.target.value })} /></label>
              <label className="production-wide-field"><span>Email</span><input type="email" value={clienteEditForm.email} onChange={(event) => setClienteEditForm({ ...clienteEditForm, email: event.target.value })} /></label>
              <div className="modal-actions production-wide-field">
                <button type="button" className="secondary-button" onClick={() => setEditingCliente(null)}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Save size={18} />Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
