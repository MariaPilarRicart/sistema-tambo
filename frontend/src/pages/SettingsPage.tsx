import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import {
  createAlimento,
  createReglaAlimentacion,
  getAlimentos,
  getReglasAlimentacion,
  updateAlimento,
  updateReglaAlimentacion,
} from '../services/alimentacionService';
import { createLote, deleteLote, getLotes, updateLote } from '../services/lotesService';
import { createReglaSanitaria, getReglasSanitarias, updateReglaSanitaria } from '../services/reglasSanitariasService';
import { createUser, deactivateUser, getUsers, updateUser } from '../services/usersService';
import type { AuthUser, UserRole } from '../types/auth';
import type {
  Alimento,
  AlimentoFormValues,
  DetalleReglaAlimentacionFormValues,
  ReglaAlimentacion,
  ReglaAlimentacionFormValues,
} from '../types/alimentacion';
import type { Lote, LoteFormValues } from '../types/lotes';
import type { ReglaSanitaria, ReglaSanitariaFormValues, TipoReglaSanitaria } from '../services/reglasSanitariasService';
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

const emptyReglaForm: ReglaSanitariaFormValues = {
  nombre: '',
  codigo: '',
  tipo: 'VACUNA',
  mesFijo: '',
  frecuenciaMeses: '12',
  anticipacionMeses: '1',
  activo: true,
  observaciones: '',
};

type SettingsTab = 'usuarios' | 'lotes' | 'vacunas' | 'alimentacion';

const emptyAlimentoForm: AlimentoFormValues = {
  nombre: '',
  tipoAlimento: 'SILO',
  unidad: 'KG',
  stockActual: '0',
  puntoStockMinimo: '0',
  activo: true,
  observaciones: '',
};

const emptyReglaAlimentacionForm: ReglaAlimentacionFormValues = {
  nombre: '',
  categoriaAnimal: '',
  activo: true,
  observaciones: '',
  detalles: [],
};

const emptyDetalleReglaForm: DetalleReglaAlimentacionFormValues = {
  alimentoId: '',
  tipoCalculo: 'KG_POR_ANIMAL_DIA',
  unidad: 'KG',
  cantidadMinima: '',
  cantidadMaxima: '',
  animalesBase: '',
  rollosBase: '',
  duracionDias: '',
  obligatorio: false,
  observaciones: '',
};

interface SettingsPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function SettingsPage({ authToken, currentUser, onUnauthorized }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('usuarios');
  const [users, setUsers] = useState<User[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [reglas, setReglas] = useState<ReglaSanitaria[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [reglasAlimentacion, setReglasAlimentacion] = useState<ReglaAlimentacion[]>([]);
  const [userFormValues, setUserFormValues] = useState<UserFormValues>(emptyUserForm);
  const [loteFormValues, setLoteFormValues] = useState<LoteFormValues>(emptyLoteForm);
  const [reglaFormValues, setReglaFormValues] = useState<ReglaSanitariaFormValues>(emptyReglaForm);
  const [alimentoFormValues, setAlimentoFormValues] = useState<AlimentoFormValues>(emptyAlimentoForm);
  const [reglaAlimentacionFormValues, setReglaAlimentacionFormValues] =
    useState<ReglaAlimentacionFormValues>(emptyReglaAlimentacionForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [editingRegla, setEditingRegla] = useState<ReglaSanitaria | null>(null);
  const [editingAlimento, setEditingAlimento] = useState<Alimento | null>(null);
  const [editingReglaAlimentacion, setEditingReglaAlimentacion] = useState<ReglaAlimentacion | null>(null);
  const [showAlimentoModal, setShowAlimentoModal] = useState(false);
  const [showReglaAlimentacionModal, setShowReglaAlimentacionModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const activeUsersCount = useMemo(() => users.filter((user) => user.activo).length, [users]);
  const activeLotesCount = useMemo(() => lotes.filter((lote) => lote.activo).length, [lotes]);
  const activeReglasCount = useMemo(() => reglas.filter((regla) => regla.activo).length, [reglas]);
  const activeReglasAlimentacionCount = useMemo(() => reglasAlimentacion.filter((regla) => regla.activo).length, [reglasAlimentacion]);
  const summaryCount = activeTab === 'usuarios' ? activeUsersCount : activeTab === 'lotes' ? activeLotesCount : activeTab === 'vacunas' ? activeReglasCount : activeReglasAlimentacionCount;
  const summaryLabel = activeTab === 'usuarios' ? 'usuarios activos' : activeTab === 'lotes' ? 'lotes activos' : activeTab === 'vacunas' ? 'reglas activas' : 'reglas de alimentación';

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

  async function loadReglas() {
    if (!authToken || !isAdmin) return;
    setIsLoading(true);
    setError('');

    try {
      setReglas(await getReglasSanitarias(authToken));
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAlimentacionConfig() {
    if (!authToken || !isAdmin) return;
    setIsLoading(true);
    setError('');

    try {
      const [nextAlimentos, nextReglas] = await Promise.all([
        getAlimentos(authToken),
        getReglasAlimentacion(authToken),
      ]);
      setAlimentos(nextAlimentos);
      setReglasAlimentacion(nextReglas);
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'usuarios') void loadUsers();
    if (activeTab === 'lotes') void loadLotes();
    if (activeTab === 'vacunas') void loadReglas();
    if (activeTab === 'alimentacion') void loadAlimentacionConfig();
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

  function resetReglaForm() {
    setEditingRegla(null);
    setReglaFormValues(emptyReglaForm);
    setError('');
    setSuccess('');
  }

  function resetAlimentoForm() {
    setEditingAlimento(null);
    setAlimentoFormValues(emptyAlimentoForm);
    setShowAlimentoModal(false);
    setError('');
    setSuccess('');
  }

  function resetReglaAlimentacionForm() {
    setEditingReglaAlimentacion(null);
    setReglaAlimentacionFormValues(emptyReglaAlimentacionForm);
    setShowReglaAlimentacionModal(false);
    setError('');
    setSuccess('');
  }

  function openNewAlimentoModal() {
    setEditingAlimento(null);
    setAlimentoFormValues({ ...emptyAlimentoForm, activo: true });
    setShowAlimentoModal(true);
    setError('');
    setSuccess('');
  }

  function openNewReglaAlimentacionModal() {
    setEditingReglaAlimentacion(null);
    setReglaAlimentacionFormValues({
      ...emptyReglaAlimentacionForm,
      activo: true,
      detalles: [{ ...emptyDetalleReglaForm }],
    });
    setShowReglaAlimentacionModal(true);
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

  function startEditingRegla(regla: ReglaSanitaria) {
    setEditingRegla(regla);
    setReglaFormValues({
      nombre: regla.nombre,
      codigo: regla.codigo,
      tipo: regla.tipo,
      mesFijo: regla.mesFijo ? String(regla.mesFijo) : '',
      frecuenciaMeses: String(regla.frecuenciaMeses),
      anticipacionMeses: String(regla.anticipacionMeses),
      activo: regla.activo,
      observaciones: regla.observaciones ?? '',
    });
    setError('');
    setSuccess('');
  }

  function startEditingAlimento(alimento: Alimento) {
    setEditingAlimento(alimento);
    setAlimentoFormValues({
      nombre: alimento.nombre,
      tipoAlimento: alimento.tipoAlimento,
      unidad: alimento.unidadMedida,
      stockActual: String(alimento.stockActual),
      puntoStockMinimo: String(alimento.stockMinimo),
      activo: alimento.activo,
      observaciones: alimento.descripcion ?? '',
    });
    setShowAlimentoModal(true);
    setError('');
    setSuccess('');
  }

  function startEditingReglaAlimentacion(regla: ReglaAlimentacion) {
    setEditingReglaAlimentacion(regla);
    setReglaAlimentacionFormValues({
      nombre: regla.nombre,
      categoriaAnimal: regla.categoriaAnimal,
      activo: regla.activo,
      observaciones: regla.observaciones ?? '',
      detalles: regla.detalles.map((detalle) => ({
        alimentoId: String(detalle.alimentoId),
        tipoCalculo: detalle.tipoCalculo,
        unidad: detalle.unidad,
        cantidadMinima: detalle.cantidadMinima === null ? '' : String(detalle.cantidadMinima),
        cantidadMaxima: detalle.cantidadMaxima === null ? '' : String(detalle.cantidadMaxima),
        animalesBase: detalle.animalesBase === null ? '' : String(detalle.animalesBase),
        rollosBase: detalle.rollosBase === null ? '' : String(detalle.rollosBase),
        duracionDias: detalle.duracionDias === null ? '' : String(detalle.duracionDias),
        obligatorio: detalle.obligatorio,
        observaciones: detalle.observaciones ?? '',
      })),
    });
    setShowReglaAlimentacionModal(true);
    setError('');
    setSuccess('');
  }

  function updateDetalleRegla(index: number, changes: Partial<DetalleReglaAlimentacionFormValues>) {
    setReglaAlimentacionFormValues((current) => ({
      ...current,
      detalles: current.detalles.map((detalle, detalleIndex) =>
        detalleIndex === index ? { ...detalle, ...changes } : detalle,
      ),
    }));
  }

  function addDetalleRegla() {
    setReglaAlimentacionFormValues((current) => ({
      ...current,
      detalles: [...current.detalles, { ...emptyDetalleReglaForm }],
    }));
  }

  function removeDetalleRegla(index: number) {
    setReglaAlimentacionFormValues((current) => ({
      ...current,
      detalles: current.detalles.filter((_detalle, detalleIndex) => detalleIndex !== index),
    }));
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

  async function handleReglaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingRegla) {
        await updateReglaSanitaria(authToken, editingRegla.id, reglaFormValues);
        resetReglaForm();
        setSuccess('Regla sanitaria actualizada correctamente.');
      } else {
        await createReglaSanitaria(authToken, reglaFormValues);
        resetReglaForm();
        setSuccess('Regla sanitaria creada correctamente.');
      }
      await loadReglas();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAlimentoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingAlimento) {
        await updateAlimento(authToken, editingAlimento.id, alimentoFormValues);
        resetAlimentoForm();
        setSuccess('Alimento actualizado correctamente.');
      } else {
        await createAlimento(authToken, alimentoFormValues);
        resetAlimentoForm();
        setSuccess('Alimento creado correctamente.');
      }
      await loadAlimentacionConfig();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReglaAlimentacionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingReglaAlimentacion) {
        await updateReglaAlimentacion(authToken, editingReglaAlimentacion.id, reglaAlimentacionFormValues);
        resetReglaAlimentacionForm();
        setSuccess('Regla de alimentación actualizada correctamente.');
      } else {
        await createReglaAlimentacion(authToken, reglaAlimentacionFormValues);
        resetReglaAlimentacionForm();
        setSuccess('Regla de alimentación creada correctamente.');
      }
      await loadAlimentacionConfig();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleReglaActiva(regla: ReglaSanitaria) {
    if (!authToken) return onUnauthorized();
    setError('');
    setSuccess('');
    try {
      await updateReglaSanitaria(authToken, regla.id, {
        nombre: regla.nombre,
        codigo: regla.codigo,
        tipo: regla.tipo,
        mesFijo: regla.mesFijo ? String(regla.mesFijo) : '',
        frecuenciaMeses: String(regla.frecuenciaMeses),
        anticipacionMeses: String(regla.anticipacionMeses),
        activo: !regla.activo,
        observaciones: regla.observaciones ?? '',
      });
      setSuccess(regla.activo ? 'Regla sanitaria desactivada.' : 'Regla sanitaria activada.');
      await loadReglas();
    } catch (updateError) {
      handleRequestError(updateError);
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
          <p>Usuarios, lotes y reglas sanitarias del sistema.</p>
        </div>
        <div className="settings-summary">
          <strong>{summaryCount}</strong>
          <span>{summaryLabel}</span>
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
        <button
          type="button"
          className={activeTab === 'vacunas' ? 'settings-tab-active' : ''}
          onClick={() => {
            setActiveTab('vacunas');
            setError('');
            setSuccess('');
          }}
        >
          Vacunas
        </button>
        <button
          type="button"
          className={activeTab === 'alimentacion' ? 'settings-tab-active' : ''}
          onClick={() => {
            setActiveTab('alimentacion');
            setError('');
            setSuccess('');
          }}
        >
          Alimentación
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
      ) : activeTab === 'lotes' ? (
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
      ) : activeTab === 'vacunas' ? (
        <div className="settings-grid">
          <section className="panel user-form-panel">
            <div className="panel-header">
              <div>
                <h2>{editingRegla ? 'Editar regla sanitaria' : 'Nueva regla sanitaria'}</h2>
                <p>Vacunas y análisis configurables para generación automática.</p>
              </div>
              {editingRegla && (
                <button type="button" className="icon-button" onClick={resetReglaForm} aria-label="Cancelar edicion">
                  <X size={18} />
                </button>
              )}
            </div>

            <form className="user-form" onSubmit={handleReglaSubmit}>
              <label><span>Nombre</span><input value={reglaFormValues.nombre} onChange={(event) => setReglaFormValues({ ...reglaFormValues, nombre: event.target.value })} required /></label>
              <label><span>Código</span><input value={reglaFormValues.codigo} onChange={(event) => setReglaFormValues({ ...reglaFormValues, codigo: event.target.value })} required /></label>
              <label>
                <span>Tipo</span>
                <select value={reglaFormValues.tipo} onChange={(event) => setReglaFormValues({ ...reglaFormValues, tipo: event.target.value as TipoReglaSanitaria })}>
                  <option value="VACUNA">VACUNA</option>
                  <option value="ANALISIS">ANALISIS</option>
                </select>
              </label>
              <label><span>Mes fijo</span><input type="number" min="1" max="12" value={reglaFormValues.mesFijo} onChange={(event) => setReglaFormValues({ ...reglaFormValues, mesFijo: event.target.value })} placeholder="Opcional" /></label>
              <label><span>Frecuencia meses</span><input type="number" min="1" value={reglaFormValues.frecuenciaMeses} onChange={(event) => setReglaFormValues({ ...reglaFormValues, frecuenciaMeses: event.target.value })} required /></label>
              <label><span>Anticipación meses</span><input type="number" min="1" value={reglaFormValues.anticipacionMeses} onChange={(event) => setReglaFormValues({ ...reglaFormValues, anticipacionMeses: event.target.value })} required /></label>
              <label><span>Observaciones</span><input value={reglaFormValues.observaciones} onChange={(event) => setReglaFormValues({ ...reglaFormValues, observaciones: event.target.value })} /></label>
              <label className="checkbox-row">
                <input type="checkbox" checked={reglaFormValues.activo} onChange={(event) => setReglaFormValues({ ...reglaFormValues, activo: event.target.checked })} />
                <span>Regla activa</span>
              </label>

              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}

              <button type="submit" className="primary-button" disabled={isSaving}>
                <Plus size={18} />
                {isSaving ? 'Guardando...' : editingRegla ? 'Guardar cambios' : 'Crear regla'}
              </button>
            </form>
          </section>

          <section className="panel users-list-panel">
            <div className="panel-header">
              <div>
                <h2>Vacunas y Reglas Sanitarias</h2>
                <p>{reglas.length} reglas registradas.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => void loadReglas()} aria-label="Actualizar reglas sanitarias">
                <RefreshCcw size={18} />
              </button>
            </div>

            {isLoading ? <p className="table-empty">Cargando reglas...</p> : (
              <div className="table-wrap">
                <table className="users-table">
                  <thead>
                    <tr><th>Regla</th><th>Tipo</th><th>Frecuencia</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {reglas.map((regla) => (
                      <tr key={regla.id}>
                        <td><strong>{regla.nombre}</strong><span>{regla.codigo}</span></td>
                        <td>{regla.tipo}</td>
                        <td>{regla.mesFijo ? `Mes ${regla.mesFijo}` : `Cada ${regla.frecuenciaMeses} meses`} · anticipa {regla.anticipacionMeses}</td>
                        <td><span className={`status-pill ${regla.activo ? 'status-active' : 'status-inactive'}`}>{regla.activo ? 'Activa' : 'Inactiva'}</span></td>
                        <td>
                          <div className="table-actions">
                            <button type="button" onClick={() => startEditingRegla(regla)} aria-label={`Editar ${regla.codigo}`}><Edit2 size={16} /></button>
                            <button type="button" onClick={() => void toggleReglaActiva(regla)} aria-label={`${regla.activo ? 'Desactivar' : 'Activar'} ${regla.codigo}`}><Trash2 size={16} /></button>
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
      ) : activeTab === 'alimentacion' ? (
        <div className="settings-page">
          <section className="panel users-list-panel">
            <div className="panel-header">
              <div>
                <h2>Alimentos / Insumos</h2>
                <p>{alimentos.length} alimentos cargados.</p>
              </div>
              <div className="header-actions">
                <button type="button" className="secondary-button" onClick={openNewAlimentoModal}><Plus size={16} /> Nuevo alimento</button>
                <button type="button" className="icon-button" onClick={() => void loadAlimentacionConfig()} aria-label="Actualizar alimentacion"><RefreshCcw size={18} /></button>
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
            {isLoading ? <p className="table-empty">Cargando configuracion...</p> : (
              <div className="table-wrap">
                <table className="users-table">
                  <thead><tr><th>Alimento</th><th>Tipo</th><th>Unidad</th><th>Stock actual</th><th>Punto minimo</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>{alimentos.map((alimento) => <tr key={alimento.id}><td><strong>{alimento.nombre}</strong><span>{alimento.descripcion || '-'}</span></td><td>{alimento.tipoAlimento}</td><td>{alimento.unidadMedida}</td><td>{alimento.stockActual}</td><td>{alimento.stockMinimo}</td><td><span className={`status-pill ${alimento.activo ? 'status-active' : 'status-inactive'}`}>{alimento.activo ? 'ACTIVO' : 'INACTIVO'}</span></td><td><div className="table-actions"><button type="button" onClick={() => startEditingAlimento(alimento)} aria-label={`Editar ${alimento.nombre}`}><Edit2 size={16} /></button></div></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel users-list-panel">
            <div className="panel-header">
              <div>
                <h2>Reglas de Alimentacion</h2>
                <p>{reglasAlimentacion.length} reglas configuradas.</p>
              </div>
              <button type="button" className="secondary-button" onClick={openNewReglaAlimentacionModal}><Plus size={16} /> Nueva regla</button>
            </div>
            <div className="table-wrap settings-secondary-table">
              <table className="users-table">
                <thead><tr><th>Regla</th><th>Categoria</th><th>Alimentos incluidos</th><th>Resumen</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{reglasAlimentacion.map((regla) => <tr key={regla.id}><td><strong>{regla.nombre}</strong><span>{regla.observaciones || '-'}</span></td><td>{regla.categoriaAnimal}</td><td>{regla.detalles.length}</td><td>{regla.detalles.map((detalle) => detalle.alimento.nombre).join(', ') || '-'}</td><td><span className={`status-pill ${regla.activo ? 'status-active' : 'status-inactive'}`}>{regla.activo ? 'ACTIVA' : 'INACTIVA'}</span></td><td><div className="table-actions"><button type="button" onClick={() => startEditingReglaAlimentacion(regla)} aria-label={`Editar ${regla.nombre}`}><Edit2 size={16} /></button></div></td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="settings-grid">
          <section className="panel user-form-panel">
            <div className="panel-header">
              <div>
                <h2>{editingAlimento ? 'Editar alimento' : 'Nuevo alimento'}</h2>
                <p>Insumos y stock inicial para alimentación.</p>
              </div>
              {editingAlimento && <button type="button" className="icon-button" onClick={resetAlimentoForm} aria-label="Cancelar edición"><X size={18} /></button>}
            </div>
            <form className="user-form" onSubmit={handleAlimentoSubmit}>
              <label><span>Nombre</span><input value={alimentoFormValues.nombre} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, nombre: event.target.value })} required /></label>
              <label><span>Tipo</span><select value={alimentoFormValues.tipoAlimento} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, tipoAlimento: event.target.value as AlimentoFormValues['tipoAlimento'] })}><option value="SILO">SILO</option><option value="BALANCEADO">BALANCEADO</option><option value="FIBRA">FIBRA</option><option value="SUPLEMENTO">SUPLEMENTO</option><option value="SALES">SALES</option><option value="OTRO">OTRO</option></select></label>
              <label><span>Unidad</span><select value={alimentoFormValues.unidad} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, unidad: event.target.value as AlimentoFormValues['unidad'] })}><option value="KG">KG</option><option value="ROLLO">ROLLO</option><option value="UNIDAD">UNIDAD</option></select></label>
              <label><span>Stock actual</span><input type="number" min="0" step="0.01" value={alimentoFormValues.stockActual} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, stockActual: event.target.value })} required /></label>
              <label><span>Punto stock mínimo</span><input type="number" min="0" step="0.01" value={alimentoFormValues.puntoStockMinimo} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, puntoStockMinimo: event.target.value })} required /></label>
              <label><span>Observaciones</span><input value={alimentoFormValues.observaciones} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, observaciones: event.target.value })} /></label>
              <label className="checkbox-row"><input type="checkbox" checked={alimentoFormValues.activo} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, activo: event.target.checked })} /><span>Activo</span></label>
              <button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : editingAlimento ? 'Guardar alimento' : 'Crear alimento'}</button>
            </form>

            <div className="panel-header panel-header-spaced">
              <div>
                <h2>{editingReglaAlimentacion ? 'Editar regla' : 'Nueva regla'}</h2>
                <p>Dieta sugerida por categoría productiva.</p>
              </div>
              {editingReglaAlimentacion && <button type="button" className="icon-button" onClick={resetReglaAlimentacionForm} aria-label="Cancelar edición"><X size={18} /></button>}
            </div>
            <form className="user-form" onSubmit={handleReglaAlimentacionSubmit}>
              <label><span>Nombre</span><input value={reglaAlimentacionFormValues.nombre} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, nombre: event.target.value })} required /></label>
              <label><span>Categoría</span><select value={reglaAlimentacionFormValues.categoriaAnimal} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, categoriaAnimal: event.target.value as ReglaAlimentacionFormValues['categoriaAnimal'] })} required><option value="">Seleccionar</option><option value="GUACHERA">GUACHERA</option><option value="ESCUELITA">ESCUELITA</option><option value="TERNERA">TERNERA</option><option value="VAQUILLONA">VAQUILLONA</option><option value="VACA_PRODUCCION">VACA_PRODUCCION</option><option value="VACA_SECA">VACA_SECA</option><option value="PREPARTO">PREPARTO</option></select></label>
              <label><span>Alimento</span><select value={reglaAlimentacionFormValues.alimentoId} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, alimentoId: event.target.value })} required><option value="">Seleccionar</option>{alimentos.filter((alimento) => alimento.activo).map((alimento) => <option key={alimento.id} value={alimento.id}>{alimento.nombre}</option>)}</select></label>
              <label><span>Tipo cálculo</span><select value={reglaAlimentacionFormValues.tipoCalculo} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, tipoCalculo: event.target.value as ReglaAlimentacionFormValues['tipoCalculo'] })}><option value="KG_POR_ANIMAL_DIA">KG por animal/día</option><option value="ROLLOS_POR_GRUPO_DURACION">Rollos por grupo</option><option value="OBLIGATORIO_SIN_CANTIDAD">Obligatorio sin cantidad</option></select></label>
              <label><span>Unidad</span><select value={reglaAlimentacionFormValues.unidad} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, unidad: event.target.value as ReglaAlimentacionFormValues['unidad'] })}><option value="KG">KG</option><option value="ROLLO">ROLLO</option><option value="UNIDAD">UNIDAD</option></select></label>
              <label><span>Cantidad mínima</span><input type="number" min="0" step="0.01" value={reglaAlimentacionFormValues.cantidadMinima} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, cantidadMinima: event.target.value })} /></label>
              <label><span>Cantidad máxima</span><input type="number" min="0" step="0.01" value={reglaAlimentacionFormValues.cantidadMaxima} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, cantidadMaxima: event.target.value })} /></label>
              <label><span>Animales base</span><input type="number" min="1" value={reglaAlimentacionFormValues.animalesBase} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, animalesBase: event.target.value })} /></label>
              <label><span>Rollos base</span><input type="number" min="0" step="0.01" value={reglaAlimentacionFormValues.rollosBase} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, rollosBase: event.target.value })} /></label>
              <label><span>Duración días</span><input type="number" min="1" value={reglaAlimentacionFormValues.duracionDias} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, duracionDias: event.target.value })} /></label>
              <label><span>Observaciones</span><input value={reglaAlimentacionFormValues.observaciones} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, observaciones: event.target.value })} /></label>
              <label className="checkbox-row"><input type="checkbox" checked={reglaAlimentacionFormValues.obligatorio} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, obligatorio: event.target.checked })} /><span>Obligatorio</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={reglaAlimentacionFormValues.activo} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, activo: event.target.checked })} /><span>Activa</span></label>
              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}
              <button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : editingReglaAlimentacion ? 'Guardar regla' : 'Crear regla'}</button>
            </form>
          </section>

          <section className="panel users-list-panel">
            <div className="panel-header">
              <div>
                <h2>Alimentos y reglas</h2>
                <p>{alimentos.length} alimentos · {reglasAlimentacion.length} reglas.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => void loadAlimentacionConfig()} aria-label="Actualizar alimentación"><RefreshCcw size={18} /></button>
            </div>
            {isLoading ? <p className="table-empty">Cargando configuración...</p> : (
              <>
                <div className="table-wrap">
                  <table className="users-table">
                    <thead><tr><th>Alimento</th><th>Tipo</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>{alimentos.map((alimento) => <tr key={alimento.id}><td><strong>{alimento.nombre}</strong><span>{alimento.descripcion || '-'}</span></td><td>{alimento.tipoAlimento}</td><td>{alimento.stockActual} {alimento.unidadMedida}</td><td><span className={`status-pill ${alimento.activo ? 'status-active' : 'status-inactive'}`}>{alimento.activo ? 'Activo' : 'Inactivo'}</span></td><td><div className="table-actions"><button type="button" onClick={() => startEditingAlimento(alimento)} aria-label={`Editar ${alimento.nombre}`}><Edit2 size={16} /></button></div></td></tr>)}</tbody>
                  </table>
                </div>
                <div className="table-wrap settings-secondary-table">
                  <table className="users-table">
                    <thead><tr><th>Regla</th><th>Categoría</th><th>Alimento</th><th>Cálculo</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>{reglasAlimentacion.map((regla) => <tr key={regla.id}><td><strong>{regla.nombre}</strong><span>{regla.observaciones || '-'}</span></td><td>{regla.categoriaAnimal}</td><td>{regla.alimento?.nombre ?? regla.detalles.map((detalle) => detalle.alimento.nombre).join(', ')}</td><td>{regla.tipoCalculo ?? '-'}</td><td><span className={`status-pill ${regla.activo ? 'status-active' : 'status-inactive'}`}>{regla.activo ? 'Activa' : 'Inactiva'}</span></td><td><div className="table-actions"><button type="button" onClick={() => startEditingReglaAlimentacion(regla)} aria-label={`Editar ${regla.nombre}`}><Edit2 size={16} /></button></div></td></tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showAlimentoModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>{editingAlimento ? 'Editar alimento' : 'Nuevo alimento'}</h2>
                <p>{editingAlimento ? 'Datos maestros y estado del insumo.' : 'El alimento se crea activo automaticamente.'}</p>
              </div>
              <button type="button" className="icon-button" onClick={resetAlimentoForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleAlimentoSubmit}>
              <label><span>Nombre</span><input value={alimentoFormValues.nombre} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, nombre: event.target.value })} required /></label>
              <label><span>Tipo de alimento</span><select value={alimentoFormValues.tipoAlimento} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, tipoAlimento: event.target.value as AlimentoFormValues['tipoAlimento'] })}><option value="SILO">SILO</option><option value="BALANCEADO">BALANCEADO</option><option value="FIBRA">FIBRA</option><option value="SUPLEMENTO">SUPLEMENTO</option><option value="SALES">SALES</option><option value="OTRO">OTRO</option></select></label>
              <label><span>Unidad</span><select value={alimentoFormValues.unidad} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, unidad: event.target.value as AlimentoFormValues['unidad'] })}><option value="KG">KG</option><option value="ROLLO">ROLLO</option><option value="UNIDAD">UNIDAD</option></select></label>
              <label><span>Stock actual</span><input type="number" min="0" step="0.01" value={alimentoFormValues.stockActual} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, stockActual: event.target.value })} required /></label>
              <label><span>Punto stock minimo</span><input type="number" min="0" step="0.01" value={alimentoFormValues.puntoStockMinimo} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, puntoStockMinimo: event.target.value })} required /></label>
              {editingAlimento && <label><span>Estado</span><select value={alimentoFormValues.activo ? 'true' : 'false'} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, activo: event.target.value === 'true' })}><option value="true">ACTIVO</option><option value="false">INACTIVO</option></select></label>}
              <label className="animal-form-message"><span>Observaciones</span><textarea rows={3} value={alimentoFormValues.observaciones} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, observaciones: event.target.value })} /></label>
              <div className="modal-actions animal-form-actions">
                <button type="button" className="secondary-button" onClick={resetAlimentoForm}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showReglaAlimentacionModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel modal-panel-wide animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>{editingReglaAlimentacion ? 'Editar regla' : 'Nueva regla'}</h2>
                <p>Dieta completa por categoria con varios alimentos.</p>
              </div>
              <button type="button" className="icon-button" onClick={resetReglaAlimentacionForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form" onSubmit={handleReglaAlimentacionSubmit}>
              <div className="feed-registration-form">
                <label><span>Nombre de la regla</span><input value={reglaAlimentacionFormValues.nombre} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, nombre: event.target.value })} required /></label>
                <label><span>Categoria</span><select value={reglaAlimentacionFormValues.categoriaAnimal} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, categoriaAnimal: event.target.value as ReglaAlimentacionFormValues['categoriaAnimal'] })} required><option value="">Seleccionar</option><option value="GUACHERA">GUACHERA</option><option value="ESCUELITA">ESCUELITA</option><option value="TERNERA">TERNERA</option><option value="VAQUILLONA">VAQUILLONA</option><option value="VACA_PRODUCCION">VACA_PRODUCCION</option><option value="VACA_SECA">VACA_SECA</option><option value="PREPARTO">PREPARTO</option></select></label>
                {editingReglaAlimentacion && <label><span>Estado</span><select value={reglaAlimentacionFormValues.activo ? 'true' : 'false'} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, activo: event.target.value === 'true' })}><option value="true">ACTIVA</option><option value="false">INACTIVA</option></select></label>}
                <label className="form-wide"><span>Observaciones</span><textarea rows={2} value={reglaAlimentacionFormValues.observaciones} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, observaciones: event.target.value })} /></label>
              </div>

              <div className="panel-header panel-header-spaced">
                <div><h2>Alimentos de la regla</h2><p>{reglaAlimentacionFormValues.detalles.length} alimentos asociados.</p></div>
                <button type="button" className="secondary-button" onClick={addDetalleRegla}><Plus size={16} /> Agregar alimento a la regla</button>
              </div>

              <div className="table-wrap">
                <table className="users-table">
                  <thead><tr><th>Alimento</th><th>Tipo calculo</th><th>Unidad</th><th>Min</th><th>Max</th><th>Animales base</th><th>Rollos base</th><th>Dias</th><th>Oblig.</th><th>Observaciones</th><th></th></tr></thead>
                  <tbody>{reglaAlimentacionFormValues.detalles.map((detalle, index) => <tr key={`${index}-${detalle.alimentoId}`}><td><select className="table-input" value={detalle.alimentoId} onChange={(event) => updateDetalleRegla(index, { alimentoId: event.target.value })}><option value="">Seleccionar</option>{alimentos.filter((alimento) => alimento.activo || alimento.id === Number(detalle.alimentoId)).map((alimento) => <option key={alimento.id} value={alimento.id}>{alimento.nombre}</option>)}</select></td><td><select className="table-input" value={detalle.tipoCalculo} onChange={(event) => updateDetalleRegla(index, { tipoCalculo: event.target.value as DetalleReglaAlimentacionFormValues['tipoCalculo'] })}><option value="KG_POR_ANIMAL_DIA">KG/animal/dia</option><option value="ROLLOS_POR_GRUPO_DURACION">Rollos/grupo</option><option value="OBLIGATORIO_SIN_CANTIDAD">Obligatorio</option></select></td><td><select className="table-input" value={detalle.unidad} onChange={(event) => updateDetalleRegla(index, { unidad: event.target.value as DetalleReglaAlimentacionFormValues['unidad'] })}><option value="KG">KG</option><option value="ROLLO">ROLLO</option><option value="UNIDAD">UNIDAD</option></select></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.cantidadMinima} onChange={(event) => updateDetalleRegla(index, { cantidadMinima: event.target.value })} /></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.cantidadMaxima} onChange={(event) => updateDetalleRegla(index, { cantidadMaxima: event.target.value })} /></td><td><input className="table-input" type="number" min="1" value={detalle.animalesBase} onChange={(event) => updateDetalleRegla(index, { animalesBase: event.target.value })} /></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.rollosBase} onChange={(event) => updateDetalleRegla(index, { rollosBase: event.target.value })} /></td><td><input className="table-input" type="number" min="1" value={detalle.duracionDias} onChange={(event) => updateDetalleRegla(index, { duracionDias: event.target.value })} /></td><td><input type="checkbox" checked={detalle.obligatorio} onChange={(event) => updateDetalleRegla(index, { obligatorio: event.target.checked })} /></td><td><input className="table-input" value={detalle.observaciones} onChange={(event) => updateDetalleRegla(index, { observaciones: event.target.value })} /></td><td><button type="button" className="icon-button" onClick={() => removeDetalleRegla(index)} aria-label="Quitar alimento"><Trash2 size={16} /></button></td></tr>)}</tbody>
                </table>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={resetReglaAlimentacionForm}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar regla'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
