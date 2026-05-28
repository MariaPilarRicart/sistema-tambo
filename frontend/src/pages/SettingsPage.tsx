import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { createLote, deleteLote, getLotes, updateLote } from '../services/lotesService';
import { createUser, deactivateUser, getUsers, updateUser } from '../services/usersService';
import type { AuthUser, UserRole } from '../types/auth';
import type { Lote, LoteFormValues } from '../types/lotes';
import type { User, UserFormValues } from '../types/users';

const emptyUserForm: UserFormValues = {
  nombre: '',
  username: '',
  email: '',
  password: '',
  rol: 'EMPLEADO',
  activo: true,
};

const emptyLoteForm: LoteFormValues = {
  nombre: '',
  descripcion: '',
  activo: true,
};

type SettingsTab = 'usuarios' | 'lotes';

interface SettingsPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function SettingsPage({ authToken, currentUser, onUnauthorized }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('usuarios');
  const [users, setUsers] = useState<User[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [userFormValues, setUserFormValues] = useState<UserFormValues>(emptyUserForm);
  const [loteFormValues, setLoteFormValues] = useState<LoteFormValues>(emptyLoteForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const activeUsersCount = useMemo(() => users.filter((user) => user.activo).length, [users]);
  const activeLotesCount = useMemo(() => lotes.filter((lote) => lote.activo).length, [lotes]);

  function handleRequestError(requestError: unknown) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }

    setError(requestError instanceof Error ? requestError.message : 'No se pudo completar la operacion.');
  }

  async function loadUsers() {
    if (!authToken || !isAdmin) return;
    setIsLoading(true);
    setError('');

    try {
      setUsers(await getUsers(authToken));
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLotes() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      setLotes(await getLotes(authToken));
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'usuarios') {
      void loadUsers();
    } else {
      void loadLotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authToken, isAdmin]);

  function resetUserForm() {
    setEditingUser(null);
    setUserFormValues(emptyUserForm);
    setError('');
    setSuccess('');
  }

  function resetLoteForm() {
    setEditingLote(null);
    setLoteFormValues(emptyLoteForm);
    setError('');
    setSuccess('');
  }

  function startEditingUser(user: User) {
    setEditingUser(user);
    setUserFormValues({
      nombre: user.nombre,
      username: user.username,
      email: user.email ?? '',
      password: '',
      rol: user.rol,
      activo: user.activo,
    });
    setError('');
    setSuccess('');
  }

  function startEditingLote(lote: Lote) {
    setEditingLote(lote);
    setLoteFormValues({
      nombre: lote.nombre,
      descripcion: lote.descripcion ?? '',
      activo: lote.activo,
    });
    setError('');
    setSuccess('');
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingUser) {
        await updateUser(authToken, editingUser.id, userFormValues);
        resetUserForm();
        setSuccess('Usuario actualizado correctamente.');
      } else {
        await createUser(authToken, userFormValues);
        resetUserForm();
        setSuccess('Usuario creado correctamente.');
      }
      await loadUsers();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingLote) {
        await updateLote(authToken, editingLote.id, loteFormValues);
        resetLoteForm();
        setSuccess('Lote actualizado correctamente.');
      } else {
        await createLote(authToken, { ...loteFormValues, activo: true });
        resetLoteForm();
        setSuccess('Lote creado correctamente.');
      }
      await loadLotes();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateUser(user: User) {
    if (!authToken) return onUnauthorized();
    if (!window.confirm(`Dar de baja al usuario ${user.username}?`)) return;
    setError('');
    setSuccess('');

    try {
      await deactivateUser(authToken, user.id);
      setSuccess('Usuario dado de baja correctamente.');
      await loadUsers();
    } catch (deleteError) {
      handleRequestError(deleteError);
    }
  }

  async function handleDeleteLote(lote: Lote) {
    if (!authToken) return onUnauthorized();
    if (!window.confirm(`Eliminar definitivamente el lote ${lote.nombre}?`)) return;
    setError('');
    setSuccess('');

    try {
      await deleteLote(authToken, lote.id);
      setSuccess('Lote eliminado correctamente.');
      await loadLotes();
    } catch (deleteError) {
      handleRequestError(deleteError);
    }
  }

  if (!isAdmin) {
    return (
      <div className="placeholder-page">
        <h2>Configuracion</h2>
        <p>No tenes permisos para administrar configuracion.</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Configuracion</h2>
          <p>Usuarios y lotes base del sistema.</p>
        </div>
        <div className="settings-summary">
          <strong>{activeTab === 'usuarios' ? activeUsersCount : activeLotesCount}</strong>
          <span>{activeTab === 'usuarios' ? 'usuarios activos' : 'lotes activos'}</span>
        </div>
      </section>

      <div className="settings-tabs" role="tablist">
        <button
          type="button"
          className={activeTab === 'usuarios' ? 'settings-tab-active' : ''}
          onClick={() => {
            setActiveTab('usuarios');
            setError('');
            setSuccess('');
          }}
        >
          Usuarios
        </button>
        <button
          type="button"
          className={activeTab === 'lotes' ? 'settings-tab-active' : ''}
          onClick={() => {
            setActiveTab('lotes');
            setError('');
            setSuccess('');
          }}
        >
          Lotes
        </button>
      </div>

      {activeTab === 'usuarios' ? (
        <div className="settings-grid">
          <section className="panel user-form-panel">
            <div className="panel-header">
              <div>
                <h2>{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                <p>{editingUser ? 'La password solo cambia si completas el campo.' : 'La password es obligatoria al crear.'}</p>
              </div>
              {editingUser && (
                <button type="button" className="icon-button" onClick={resetUserForm} aria-label="Cancelar edicion">
                  <X size={18} />
                </button>
              )}
            </div>

            <form className="user-form" onSubmit={handleUserSubmit}>
              <label>
                <span>Nombre</span>
                <input value={userFormValues.nombre} onChange={(event) => setUserFormValues({ ...userFormValues, nombre: event.target.value })} required />
              </label>
              <label>
                <span>Username</span>
                <input value={userFormValues.username} onChange={(event) => setUserFormValues({ ...userFormValues, username: event.target.value })} required />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={userFormValues.email} onChange={(event) => setUserFormValues({ ...userFormValues, email: event.target.value })} />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={userFormValues.password} onChange={(event) => setUserFormValues({ ...userFormValues, password: event.target.value })} required={!editingUser} placeholder={editingUser ? 'Dejar vacio para no cambiar' : ''} />
              </label>
              <label>
                <span>Rol</span>
                <select value={userFormValues.rol} onChange={(event) => setUserFormValues({ ...userFormValues, rol: event.target.value as UserRole })}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="EMPLEADO">EMPLEADO</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={userFormValues.activo} onChange={(event) => setUserFormValues({ ...userFormValues, activo: event.target.checked })} />
                <span>Usuario activo</span>
              </label>

              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}

              <button type="submit" className="primary-button" disabled={isSaving}>
                <Plus size={18} />
                {isSaving ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </form>
          </section>

          <section className="panel users-list-panel">
            <div className="panel-header">
              <div>
                <h2>Listado</h2>
                <p>{users.length} usuarios registrados.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => void loadUsers()} aria-label="Actualizar usuarios">
                <RefreshCcw size={18} />
              </button>
            </div>

            {isLoading ? <p className="table-empty">Cargando usuarios...</p> : (
              <div className="table-wrap">
                <table className="users-table">
                  <thead>
                    <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.nombre}</strong><span>{user.username}</span></td>
                        <td>{user.rol}</td>
                        <td><span className={`status-pill ${user.activo ? 'status-active' : 'status-inactive'}`}>{user.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                          <div className="table-actions">
                            <button type="button" onClick={() => startEditingUser(user)} aria-label={`Editar ${user.username}`}><Edit2 size={16} /></button>
                            <button type="button" onClick={() => void handleDeactivateUser(user)} disabled={!user.activo} aria-label={`Dar de baja ${user.username}`}><Trash2 size={16} /></button>
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
      ) : (
        <div className="settings-grid">
          <section className="panel user-form-panel">
            <div className="panel-header">
              <div>
                <h2>{editingLote ? 'Editar lote' : 'Nuevo lote'}</h2>
                <p>El nombre debe ser unico.</p>
              </div>
              {editingLote && (
                <button type="button" className="icon-button" onClick={resetLoteForm} aria-label="Cancelar edicion">
                  <X size={18} />
                </button>
              )}
            </div>

            <form className="user-form" onSubmit={handleLoteSubmit}>
              <label>
                <span>Nombre</span>
                <input value={loteFormValues.nombre} onChange={(event) => setLoteFormValues({ ...loteFormValues, nombre: event.target.value })} required />
              </label>
              <label>
                <span>Descripcion</span>
                <input value={loteFormValues.descripcion} onChange={(event) => setLoteFormValues({ ...loteFormValues, descripcion: event.target.value })} />
              </label>
              {editingLote && (
                <label className="checkbox-row">
                  <input type="checkbox" checked={loteFormValues.activo} onChange={(event) => setLoteFormValues({ ...loteFormValues, activo: event.target.checked })} />
                  <span>Lote activo</span>
                </label>
              )}

              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}

              <button type="submit" className="primary-button" disabled={isSaving}>
                <Plus size={18} />
                {isSaving ? 'Guardando...' : editingLote ? 'Guardar cambios' : 'Crear lote'}
              </button>
            </form>
          </section>

          <section className="panel users-list-panel">
            <div className="panel-header">
              <div>
                <h2>Listado</h2>
                <p>{lotes.length} lotes registrados.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => void loadLotes()} aria-label="Actualizar lotes">
                <RefreshCcw size={18} />
              </button>
            </div>

            {isLoading ? <p className="table-empty">Cargando lotes...</p> : (
              <div className="table-wrap">
                <table className="users-table">
                  <thead>
                    <tr><th>Lote</th><th>Animales</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {lotes.map((lote) => (
                      <tr key={lote.id}>
                        <td><strong>{lote.nombre}</strong><span>{lote.descripcion || 'Sin descripcion'}</span></td>
                        <td>{lote.cantidadAnimales}</td>
                        <td><span className={`status-pill ${lote.activo ? 'status-active' : 'status-inactive'}`}>{lote.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                          <div className="table-actions">
                            <button type="button" onClick={() => startEditingLote(lote)} aria-label={`Editar ${lote.nombre}`}><Edit2 size={16} /></button>
                            <button type="button" onClick={() => void handleDeleteLote(lote)} aria-label={`Eliminar ${lote.nombre}`}><Trash2 size={16} /></button>
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
      )}
    </div>
  );
}
