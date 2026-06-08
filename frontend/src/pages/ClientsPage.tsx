import { FormEvent, useEffect, useState } from 'react';
import { Edit2, Eye, Power, RefreshCcw, Save, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { createCliente, getCliente, getClientes, updateCliente, updateClienteEstado } from '../services/clientesService';
import { compareByStatusThenName, formatDate, statusClass } from '../utils/display';
import type { AuthUser } from '../types/auth';
import type { Cliente, ClienteCreateValues, ClienteDetalle, ClienteEditValues } from '../types/clientes';

const emptyCreateForm: ClienteCreateValues = {
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

function formatLiters(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} l`;
}

function formatCurrency(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

interface ClientsPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function ClientsPage({ authToken, currentUser, onUnauthorized }: ClientsPageProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [createForm, setCreateForm] = useState<ClienteCreateValues>(emptyCreateForm);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editForm, setEditForm] = useState<ClienteEditValues | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<ClienteDetalle | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  async function loadData(nextSearch = search) {
    if (!authToken) return;
    setIsLoading(true);
    setError('');
    try {
      setClientes(await getClientes(authToken, nextSearch));
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudieron cargar los clientes.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(search), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, search]);

  function clearFilters() {
    setSearch('');
    void loadData('');
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await createCliente(authToken, createForm);
      setCreateForm(emptyCreateForm);
      setSuccess('Cliente creado correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo crear el cliente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (!editingCliente || !editForm) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateCliente(authToken, editingCliente.id, editForm);
      setEditingCliente(null);
      setEditForm(null);
      setSuccess('Cliente actualizado correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo actualizar el cliente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEstado(cliente: Cliente, activo: boolean) {
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateClienteEstado(authToken, cliente.id, activo);
      setSuccess(activo ? 'Cliente activado correctamente.' : 'Cliente desactivado correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo cambiar el estado del cliente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function openClienteDetalle(cliente: Cliente) {
    if (!authToken) return onUnauthorized();
    setSelectedCliente(null);
    setError('');
    try {
      setSelectedCliente(await getCliente(authToken, cliente.id));
    } catch (detailError) {
      handleRequestError(detailError, 'No se pudo cargar el detalle del cliente.');
    }
  }

  function startEditing(cliente: Cliente) {
    setEditingCliente(cliente);
    setEditForm(editValuesFromCliente(cliente));
    setError('');
    setSuccess('');
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Clientes</h2>
          <p>Alta, consulta y baja lógica de compradores de leche.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar clientes">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Nuevo cliente</h2>
            <p>{isAdmin ? 'CUIT y razón social quedan fijos al crear.' : 'Solo usuarios ADMIN pueden crear clientes.'}</p>
          </div>
        </div>
        {isAdmin ? (
          <form className="user-form production-form" onSubmit={handleCreate}>
            <label><span>CUIT</span><input value={createForm.cuit} onChange={(event) => setCreateForm({ ...createForm, cuit: event.target.value })} required /></label>
            <label><span>Razón social / nombre</span><input value={createForm.razonSocial} onChange={(event) => setCreateForm({ ...createForm, razonSocial: event.target.value })} required /></label>
            <label><span>Dirección</span><input value={createForm.direccion} onChange={(event) => setCreateForm({ ...createForm, direccion: event.target.value })} /></label>
            <label><span>Teléfono</span><input value={createForm.telefono} onChange={(event) => setCreateForm({ ...createForm, telefono: event.target.value })} /></label>
            <label><span>Email</span><input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} /></label>
            <button type="submit" className="primary-button production-wide-field" disabled={isSaving}><Save size={18} />Guardar cliente</button>
          </form>
        ) : <p className="table-empty">Podés consultar clientes y ventas asociadas.</p>}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Listado de clientes</h2>
            <p>{clientes.length} clientes encontrados.</p>
          </div>
          <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar listado de clientes">
            <RefreshCcw size={18} />
          </button>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field production-selector">
            <span>Buscar</span>
            <input
              placeholder="Buscar por CUIT o razón social..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando clientes...</p> : (
          <div className="table-wrap feed-table-wrap">
            <table className="users-table">
              <thead><tr><th>CUIT</th><th>Razón social</th><th>Dirección</th><th>Teléfono</th><th>Email</th><th>Fecha alta</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {[...clientes].sort((left, right) => compareByStatusThenName(
                  left,
                  right,
                  (item) => (item.activo ? 'ACTIVO' : 'INACTIVO'),
                  (item) => item.razonSocial,
                )).map((cliente) => (
                  <tr key={cliente.id}>
                    <td><strong>{cliente.cuit}</strong></td>
                    <td>{cliente.razonSocial}</td>
                    <td>{cliente.direccion || '-'}</td>
                    <td>{cliente.telefono || '-'}</td>
                    <td>{cliente.email || '-'}</td>
                    <td>{formatDate(cliente.fechaAlta)}</td>
                    <td><span className={`status-pill ${statusClass(cliente.activo ? 'ACTIVO' : 'INACTIVO')}`}>{cliente.activo ? 'ACTIVO' : 'INACTIVO'}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => void openClienteDetalle(cliente)} aria-label={`Ver detalle de ${cliente.razonSocial}`}><Eye size={16} /></button>
                        {isAdmin && <button type="button" onClick={() => startEditing(cliente)} aria-label={`Editar ${cliente.razonSocial}`}><Edit2 size={16} /></button>}
                        {isAdmin && (
                          <button type="button" onClick={() => void handleEstado(cliente, !cliente.activo)} aria-label={cliente.activo ? 'Desactivar cliente' : 'Activar cliente'}>
                            <Power size={16} />
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

      {selectedCliente && (
        <div className="modal-backdrop">
          <div className="modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>{selectedCliente.razonSocial}</h2>
                <p>Detalle y trazabilidad comercial.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedCliente(null)} aria-label="Cerrar detalle"><X size={18} /></button>
            </div>
            <div className="info-grid">
              <div className="info-item"><span>CUIT</span><strong>{selectedCliente.cuit}</strong></div>
              <div className="info-item"><span>Razón social</span><strong>{selectedCliente.razonSocial}</strong></div>
              <div className="info-item"><span>Dirección</span><strong>{selectedCliente.direccion || '-'}</strong></div>
              <div className="info-item"><span>Teléfono</span><strong>{selectedCliente.telefono || '-'}</strong></div>
              <div className="info-item"><span>Email</span><strong>{selectedCliente.email || '-'}</strong></div>
              <div className="info-item"><span>Fecha alta</span><strong>{formatDate(selectedCliente.fechaAlta)}</strong></div>
              <div className="info-item"><span>Estado</span><strong>{selectedCliente.activo ? 'Activo' : 'Inactivo'}</strong></div>
              <div className="info-item"><span>Ventas</span><strong>{selectedCliente.resumen.cantidadVentas}</strong></div>
              <div className="info-item"><span>Total litros comprados</span><strong>{formatLiters(selectedCliente.resumen.litrosComprados)}</strong></div>
              <div className="info-item"><span>Importe total comprado</span><strong>{formatCurrency(selectedCliente.resumen.importeTotalComprado)}</strong></div>
            </div>
            <div className="table-wrap feed-table-wrap">
              <table className="users-table">
                <thead><tr><th>Fecha</th><th>Factura</th><th>Litros</th><th>Importe</th></tr></thead>
                <tbody>
                  {selectedCliente.ventas.map((venta) => (
                    <tr key={venta.id}>
                      <td>{formatDate(venta.fechaVenta)}</td>
                      <td><strong>{venta.numeroFactura}</strong></td>
                      <td>{formatLiters(venta.totalLitros)}</td>
                      <td>{formatCurrency(venta.precioTotal)}</td>
                    </tr>
                  ))}
                  {selectedCliente.ventas.length === 0 && <tr><td colSpan={4}>Sin ventas asociadas.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingCliente && editForm && (
        <div className="modal-backdrop">
          <div className="modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Editar cliente</h2>
                <p>{editingCliente.razonSocial}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setEditingCliente(null)} aria-label="Cerrar edición"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleEdit}>
              <label><span>CUIT</span><input value={editingCliente.cuit} readOnly /></label>
              <label><span>Razón social</span><input value={editingCliente.razonSocial} readOnly /></label>
              <label><span>Fecha alta</span><input value={formatDate(editingCliente.fechaAlta)} readOnly /></label>
              <label><span>Estado</span><select value={String(editForm.activo)} onChange={(event) => setEditForm({ ...editForm, activo: event.target.value === 'true' })}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
              <label><span>Dirección</span><input value={editForm.direccion} onChange={(event) => setEditForm({ ...editForm, direccion: event.target.value })} /></label>
              <label><span>Teléfono</span><input value={editForm.telefono} onChange={(event) => setEditForm({ ...editForm, telefono: event.target.value })} /></label>
              <label className="production-wide-field"><span>Email</span><input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
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
