import { FormEvent, useEffect, useState } from 'react';
import { Edit2, RefreshCcw, Save, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { createCliente, getCliente, getClientes, updateCliente, updateClienteEstado } from '../services/clientesService';
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR');
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

  async function loadData() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');
    try {
      setClientes(await getClientes(authToken));
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudieron cargar los clientes.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

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

      <div className="feed-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Nuevo cliente</h2>
              <p>{isAdmin ? 'CUIT y razón social quedan fijos al crear.' : 'Solo usuarios ADMIN pueden crear clientes.'}</p>
            </div>
          </div>
          {isAdmin ? (
            <form className="user-form" onSubmit={handleCreate}>
              <label><span>CUIT</span><input value={createForm.cuit} onChange={(event) => setCreateForm({ ...createForm, cuit: event.target.value })} required /></label>
              <label><span>Razón social / nombre</span><input value={createForm.razonSocial} onChange={(event) => setCreateForm({ ...createForm, razonSocial: event.target.value })} required /></label>
              <label><span>Dirección</span><input value={createForm.direccion} onChange={(event) => setCreateForm({ ...createForm, direccion: event.target.value })} /></label>
              <label><span>Teléfono</span><input value={createForm.telefono} onChange={(event) => setCreateForm({ ...createForm, telefono: event.target.value })} /></label>
              <label><span>Email</span><input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} /></label>
              <button type="submit" className="primary-button" disabled={isSaving}><Save size={18} />Guardar cliente</button>
            </form>
          ) : <p className="table-empty">Podés consultar clientes y ventas asociadas.</p>}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Detalle del cliente</h2>
              <p>Ventas, litros comprados e importe total.</p>
            </div>
          </div>
          {selectedCliente ? (
            <div className="dashboard-kpi-grid production-stats-grid">
              <article className="dashboard-kpi-card dashboard-kpi-emerald"><strong>Cliente</strong><h3>{selectedCliente.razonSocial}</h3></article>
              <article className="dashboard-kpi-card dashboard-kpi-blue"><strong>Ventas</strong><h3>{selectedCliente.resumen.cantidadVentas}</h3></article>
              <article className="dashboard-kpi-card dashboard-kpi-indigo"><strong>Litros comprados</strong><h3>{formatLiters(selectedCliente.resumen.litrosComprados)}</h3></article>
              <article className="dashboard-kpi-card dashboard-kpi-amber"><strong>Importe total</strong><h3>{formatCurrency(selectedCliente.resumen.importeTotalComprado)}</h3></article>
            </div>
          ) : <p className="table-empty">Seleccioná un cliente para ver su trazabilidad.</p>}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Listado de clientes</h2>
            <p>{clientes.length} clientes registrados.</p>
          </div>
        </div>
        {isLoading ? <p className="table-empty">Cargando clientes...</p> : (
          <div className="table-wrap">
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
                        <button type="button" onClick={() => void openClienteDetalle(cliente)} aria-label={`Ver ${cliente.razonSocial}`}><RefreshCcw size={16} /></button>
                        {isAdmin && <button type="button" onClick={() => startEditing(cliente)} aria-label={`Editar ${cliente.razonSocial}`}><Edit2 size={16} /></button>}
                        {isAdmin && (
                          <button type="button" onClick={() => void handleEstado(cliente, !cliente.activo)} aria-label={cliente.activo ? 'Desactivar cliente' : 'Activar cliente'}>
                            <X size={16} />
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

