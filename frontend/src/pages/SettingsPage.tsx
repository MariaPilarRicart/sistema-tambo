import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, KeyRound, Plus, RefreshCcw, RotateCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { createUser, deactivateUser, getUsers, resetUserPassword, updateUser } from '../services/usersService';
import type { AuthUser, UserRole } from '../types/auth';
import type { User, UserFormValues } from '../types/users';

type EstadoFilter = '' | 'true' | 'false';

const emptyUserForm: UserFormValues = {
  nombre: '',
  username: '',
  email: '',
  password: '',
  rol: 'EMPLEADO',
  activo: true,
};

interface SettingsPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

function textIncludes(value: string | null | undefined, query: string) {
  return (value ?? '').toLowerCase().includes(query);
}

function matchesEstado(value: boolean, filter: EstadoFilter) {
  return !filter || String(value) === filter;
}

function confirmLogicalDelete() {
  return window.confirm('¿Seguro que querés dar de baja este registro?');
}

function renderStatus(active: boolean) {
  return <span className={`status-pill ${active ? 'status-active' : 'status-inactive'}`}>{active ? 'ACTIVO' : 'INACTIVO'}</span>;
}

export function SettingsPage({ authToken, currentUser, onUnauthorized }: SettingsPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [userFormValues, setUserFormValues] = useState<UserFormValues>(emptyUserForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFilters, setUserFilters] = useState({ buscar: '', estado: '' as EstadoFilter, rol: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const activeUsersCount = useMemo(() => users.filter((user) => user.activo).length, [users]);

  const visibleUsers = useMemo(() => {
    const query = userFilters.buscar.trim().toLowerCase();
    return users.filter((user) => {
      const searchMatch = !query || textIncludes(user.nombre, query) || textIncludes(user.email, query) || textIncludes(user.username, query);
      return searchMatch && matchesEstado(user.activo, userFilters.estado) && (!userFilters.rol || user.rol === userFilters.rol);
    });
  }, [users, userFilters]);

  function handleRequestError(requestError: unknown) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : 'No se pudo completar la operación.');
  }

  function clearMessages() {
    setError('');
    setSuccess('');
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

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, isAdmin]);

  useDataChangedRefresh(() => loadUsers(), [authToken, isAdmin]);

  function clearUserFilters() {
    setUserFilters({ buscar: '', estado: '', rol: '' });
  }

  function resetUserForm() {
    setEditingUser(null);
    setUserFormValues(emptyUserForm);
    setShowUserModal(false);
    clearMessages();
  }

  function openNewUserModal() {
    setEditingUser(null);
    setUserFormValues({ ...emptyUserForm, activo: true });
    setShowUserModal(true);
    clearMessages();
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
    setShowUserModal(true);
    clearMessages();
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    clearMessages();
    try {
      if (editingUser) {
        await updateUser(authToken, editingUser.id, userFormValues);
        resetUserForm();
        setSuccess('Usuario actualizado correctamente.');
      } else {
        const createdUser = await createUser(authToken, { ...userFormValues, activo: true });
        resetUserForm();
        setSuccess(createdUser.contrasenaTemporal ? `Usuario creado correctamente. Contraseña inicial: ${createdUser.contrasenaTemporal}` : 'Usuario creado correctamente.');
      }
      await loadUsers();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function setUserActive(user: User, activo: boolean) {
    if (!authToken) return onUnauthorized();
    if (!activo && !confirmLogicalDelete()) return;
    clearMessages();
    try {
      if (activo) {
        await updateUser(authToken, user.id, { ...emptyUserForm, ...user, email: user.email ?? '', password: '', activo: true });
      } else {
        await deactivateUser(authToken, user.id);
      }
      setSuccess(activo ? 'Usuario reactivado correctamente.' : 'Usuario dado de baja correctamente.');
      await loadUsers();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  async function handleResetPassword() {
    if (!authToken) return onUnauthorized();
    if (!editingUser) return;
    setIsSaving(true);
    clearMessages();
    try {
      const user = await resetUserPassword(authToken, editingUser.id);
      resetUserForm();
      setSuccess(`Contraseña restablecida correctamente.\nUsuario: ${user.username}\nContraseña temporal: ${user.contrasenaTemporal}\nEl usuario deberá cambiarla en el próximo ingreso.`);
      await loadUsers();
    } catch (resetError) {
      handleRequestError(resetError);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="placeholder-page">
        <h2>Usuarios</h2>
        <p>No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Usuarios</h2>
          <p>Usuarios del sistema.</p>
        </div>
        <div className="settings-summary">
          <strong>{activeUsersCount}</strong>
          <span>usuarios activos</span>
        </div>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <section className="panel users-list-panel">
        <div className="panel-header">
          <div>
            <h2>Usuarios</h2>
            <p>{visibleUsers.length} de {users.length} usuarios registrados.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={openNewUserModal}><Plus size={16} /> Nuevo usuario</button>
            <button type="button" className="icon-button" onClick={() => void loadUsers()} aria-label="Actualizar usuarios"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field"><span>Buscar</span><input value={userFilters.buscar} onChange={(event) => setUserFilters({ ...userFilters, buscar: event.target.value })} placeholder="Nombre o email" /></label>
          <label className="filter-field"><span>Estado</span><select value={userFilters.estado} onChange={(event) => setUserFilters({ ...userFilters, estado: event.target.value as EstadoFilter })}><option value="">Todos</option><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
          <label className="filter-field"><span>Rol</span><select value={userFilters.rol} onChange={(event) => setUserFilters({ ...userFilters, rol: event.target.value })}><option value="">Todos</option><option value="ADMIN">ADMIN</option><option value="EMPLEADO">EMPLEADO</option></select></label>
          <button type="button" className="secondary-button" onClick={clearUserFilters}>Limpiar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando usuarios...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Password</th><th>Acciones</th></tr></thead>
              <tbody>{visibleUsers.map((user) => <tr key={user.id}><td><strong>{user.nombre}</strong><span>{user.username}</span></td><td>{user.email ?? '-'}</td><td>{user.rol}</td><td>{renderStatus(user.activo)}</td><td>{user.debeCambiarPassword ? 'Debe cambiar' : 'Actualizada'}</td><td><div className="table-actions"><button type="button" onClick={() => startEditingUser(user)} aria-label={`Editar ${user.username}`}><Edit2 size={16} /></button>{user.activo ? <button type="button" onClick={() => void setUserActive(user, false)} aria-label={`Dar de baja ${user.username}`}><Trash2 size={16} /></button> : <button type="button" onClick={() => void setUserActive(user, true)} aria-label={`Reactivar ${user.username}`}><RotateCcw size={16} /></button>}</div></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      {showUserModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div><h2>{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h2><p>{editingUser ? 'Podés restablecer la contraseña si el usuario perdió acceso.' : 'La contraseña inicial será igual al username y deberá cambiarla en el primer ingreso.'}</p></div>
              <button type="button" className="icon-button" onClick={resetUserForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleUserSubmit}>
              <label><span>Nombre</span><input value={userFormValues.nombre} onChange={(event) => setUserFormValues({ ...userFormValues, nombre: event.target.value })} required /></label>
              <label><span>Username</span><input value={userFormValues.username} onChange={(event) => setUserFormValues({ ...userFormValues, username: event.target.value })} required /></label>
              <label><span>Email</span><input type="email" value={userFormValues.email} onChange={(event) => setUserFormValues({ ...userFormValues, email: event.target.value })} /></label>
              <label><span>Rol</span><select value={userFormValues.rol} onChange={(event) => setUserFormValues({ ...userFormValues, rol: event.target.value as UserRole })}><option value="ADMIN">ADMIN</option><option value="EMPLEADO">EMPLEADO</option></select></label>
              {editingUser && <label><span>Estado</span><select value={userFormValues.activo ? 'true' : 'false'} onChange={(event) => setUserFormValues({ ...userFormValues, activo: event.target.value === 'true' })}><option value="true">ACTIVO</option><option value="false">INACTIVO</option></select></label>}
              <div className="modal-actions animal-form-actions">
                {editingUser && <button type="button" className="secondary-button" onClick={() => void handleResetPassword()} disabled={isSaving}><KeyRound size={18} />Restablecer contraseña</button>}
                <button type="button" className="secondary-button" onClick={resetUserForm}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
