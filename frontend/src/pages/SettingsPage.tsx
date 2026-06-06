import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RefreshCcw, RotateCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import {
  createAlimento,
  createReglaAlimentacion,
  getAlimentos,
  getReglasAlimentacion,
  updateAlimento,
  updateReglaAlimentacion,
} from '../services/alimentacionService';
import { createLote, getLotes, updateLote } from '../services/lotesService';
import { createReglaSanitaria, getReglasSanitarias, updateReglaSanitaria } from '../services/reglasSanitariasService';
import { createUser, deactivateUser, getUsers, updateUser } from '../services/usersService';
import type { AuthUser, UserRole } from '../types/auth';
import type {
  Alimento,
  AlimentoFormValues,
  DetalleReglaAlimentacionFormValues,
  ReglaAlimentacion,
  ReglaAlimentacionFormValues,
  TipoAlimento,
} from '../types/alimentacion';
import type { CategoriaAnimal } from '../types/animales';
import type { Lote, LoteFormValues } from '../types/lotes';
import type { ReglaSanitaria, ReglaSanitariaFormValues, TipoReglaSanitaria } from '../services/reglasSanitariasService';
import type { User, UserFormValues } from '../types/users';

type SettingsTab = 'usuarios' | 'lotes' | 'vacunas' | 'alimentacion';
type EstadoFilter = '' | 'true' | 'false';

const tipoAlimentoOptions: TipoAlimento[] = ['SILO', 'BALANCEADO', 'FIBRA', 'SUPLEMENTO', 'SALES', 'OTRO'];
const categoriaOptions: CategoriaAnimal[] = [
  'GUACHERA',
  'ESCUELITA',
  'TERNERA',
  'VAQUILLONA',
  'VACA_PRODUCCION',
  'VACA_SECA',
  'PREPARTO',
];

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

function textIncludes(value: string | null | undefined, query: string) {
  return (value ?? '').toLowerCase().includes(query);
}

function matchesEstado(value: boolean, filter: EstadoFilter) {
  return !filter || String(value) === filter;
}

function confirmLogicalDelete() {
  return window.confirm('¿Seguro que querés dar de baja este registro?');
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

  const [showUserModal, setShowUserModal] = useState(false);
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [showReglaModal, setShowReglaModal] = useState(false);
  const [showAlimentoModal, setShowAlimentoModal] = useState(false);
  const [showReglaAlimentacionModal, setShowReglaAlimentacionModal] = useState(false);

  const [userFilters, setUserFilters] = useState({ buscar: '', estado: '' as EstadoFilter, rol: '' });
  const [loteFilters, setLoteFilters] = useState({ buscar: '', estado: '' as EstadoFilter, minAnimales: '', maxAnimales: '' });
  const [reglaFilters, setReglaFilters] = useState({ buscar: '', estado: '' as EstadoFilter, tipo: '', frecuencia: '' });
  const [alimentoFilters, setAlimentoFilters] = useState({ buscar: '', estado: '' as EstadoFilter, tipoAlimento: '' });
  const [reglaAlimentacionFilters, setReglaAlimentacionFilters] = useState({
    buscar: '',
    estado: '' as EstadoFilter,
    categoriaAnimal: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const activeUsersCount = useMemo(() => users.filter((user) => user.activo).length, [users]);
  const activeLotesCount = useMemo(() => lotes.filter((lote) => lote.activo).length, [lotes]);
  const activeReglasCount = useMemo(() => reglas.filter((regla) => regla.activo).length, [reglas]);
  const activeAlimentosCount = useMemo(() => alimentos.filter((alimento) => alimento.activo).length, [alimentos]);

  const summaryCount =
    activeTab === 'usuarios'
      ? activeUsersCount
      : activeTab === 'lotes'
        ? activeLotesCount
        : activeTab === 'vacunas'
          ? activeReglasCount
          : activeAlimentosCount;
  const summaryLabel =
    activeTab === 'usuarios'
      ? 'usuarios activos'
      : activeTab === 'lotes'
        ? 'lotes activos'
        : activeTab === 'vacunas'
          ? 'reglas activas'
          : 'alimentos activos';

  const visibleUsers = useMemo(() => {
    const query = userFilters.buscar.trim().toLowerCase();
    return users.filter((user) => {
      const searchMatch = !query || textIncludes(user.nombre, query) || textIncludes(user.email, query) || textIncludes(user.username, query);
      return searchMatch && matchesEstado(user.activo, userFilters.estado) && (!userFilters.rol || user.rol === userFilters.rol);
    });
  }, [users, userFilters]);

  const visibleLotes = useMemo(() => {
    const query = loteFilters.buscar.trim().toLowerCase();
    const min = loteFilters.minAnimales === '' ? null : Number(loteFilters.minAnimales);
    const max = loteFilters.maxAnimales === '' ? null : Number(loteFilters.maxAnimales);
    return lotes.filter((lote) => {
      const searchMatch = !query || textIncludes(lote.nombre, query) || textIncludes(lote.descripcion, query);
      const minMatch = min === null || lote.cantidadAnimales >= min;
      const maxMatch = max === null || lote.cantidadAnimales <= max;
      return searchMatch && matchesEstado(lote.activo, loteFilters.estado) && minMatch && maxMatch;
    });
  }, [lotes, loteFilters]);

  const visibleReglas = useMemo(() => {
    const query = reglaFilters.buscar.trim().toLowerCase();
    return reglas.filter((regla) => {
      const searchMatch = !query || textIncludes(regla.nombre, query) || textIncludes(regla.codigo, query);
      const frequencyMatch = !reglaFilters.frecuencia || String(regla.frecuenciaMeses) === reglaFilters.frecuencia;
      return searchMatch && matchesEstado(regla.activo, reglaFilters.estado) && (!reglaFilters.tipo || regla.tipo === reglaFilters.tipo) && frequencyMatch;
    });
  }, [reglas, reglaFilters]);

  const visibleAlimentos = useMemo(() => {
    const query = alimentoFilters.buscar.trim().toLowerCase();
    return alimentos.filter((alimento) => {
      const searchMatch = !query || textIncludes(alimento.nombre, query);
      return searchMatch && matchesEstado(alimento.activo, alimentoFilters.estado) && (!alimentoFilters.tipoAlimento || alimento.tipoAlimento === alimentoFilters.tipoAlimento);
    });
  }, [alimentos, alimentoFilters]);

  const visibleReglasAlimentacion = useMemo(() => {
    const query = reglaAlimentacionFilters.buscar.trim().toLowerCase();
    return reglasAlimentacion.filter((regla) => {
      const searchMatch = !query || textIncludes(regla.nombre, query);
      return searchMatch && matchesEstado(regla.activo, reglaAlimentacionFilters.estado) && (!reglaAlimentacionFilters.categoriaAnimal || regla.categoriaAnimal === reglaAlimentacionFilters.categoriaAnimal);
    });
  }, [reglasAlimentacion, reglaAlimentacionFilters]);

  const availableFrequencies = useMemo(
    () => [...new Set(reglas.map((regla) => regla.frecuenciaMeses))].sort((a, b) => a - b),
    [reglas],
  );
  const availableAlimentoTypes = useMemo(
    () => tipoAlimentoOptions.filter((tipo) => alimentos.some((alimento) => alimento.tipoAlimento === tipo)),
    [alimentos],
  );
  const availableCategoriasReglas = useMemo(
    () => categoriaOptions.filter((categoria) => reglasAlimentacion.some((regla) => regla.categoriaAnimal === categoria)),
    [reglasAlimentacion],
  );

  function handleRequestError(requestError: unknown) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : 'No se pudo completar la operación.');
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

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function resetUserForm() {
    setEditingUser(null);
    setUserFormValues(emptyUserForm);
    setShowUserModal(false);
    clearMessages();
  }

  function resetLoteForm() {
    setEditingLote(null);
    setLoteFormValues(emptyLoteForm);
    setShowLoteModal(false);
    clearMessages();
  }

  function resetReglaForm() {
    setEditingRegla(null);
    setReglaFormValues(emptyReglaForm);
    setShowReglaModal(false);
    clearMessages();
  }

  function resetAlimentoForm() {
    setEditingAlimento(null);
    setAlimentoFormValues(emptyAlimentoForm);
    setShowAlimentoModal(false);
    clearMessages();
  }

  function resetReglaAlimentacionForm() {
    setEditingReglaAlimentacion(null);
    setReglaAlimentacionFormValues(emptyReglaAlimentacionForm);
    setShowReglaAlimentacionModal(false);
    clearMessages();
  }

  function openNewUserModal() {
    setEditingUser(null);
    setUserFormValues({ ...emptyUserForm, activo: true });
    setShowUserModal(true);
    clearMessages();
  }

  function openNewLoteModal() {
    setEditingLote(null);
    setLoteFormValues({ ...emptyLoteForm, activo: true });
    setShowLoteModal(true);
    clearMessages();
  }

  function openNewReglaModal() {
    setEditingRegla(null);
    setReglaFormValues({ ...emptyReglaForm, activo: true });
    setShowReglaModal(true);
    clearMessages();
  }

  function openNewAlimentoModal() {
    setEditingAlimento(null);
    setAlimentoFormValues({ ...emptyAlimentoForm, activo: true });
    setShowAlimentoModal(true);
    clearMessages();
  }

  function openNewReglaAlimentacionModal() {
    setEditingReglaAlimentacion(null);
    setReglaAlimentacionFormValues({
      ...emptyReglaAlimentacionForm,
      activo: true,
      detalles: [{ ...emptyDetalleReglaForm }],
    });
    setShowReglaAlimentacionModal(true);
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

  function startEditingLote(lote: Lote) {
    setEditingLote(lote);
    setLoteFormValues({
      nombre: lote.nombre,
      descripcion: lote.descripcion ?? '',
      activo: lote.activo,
    });
    setShowLoteModal(true);
    clearMessages();
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
    setShowReglaModal(true);
    clearMessages();
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
    clearMessages();
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
    clearMessages();
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
    clearMessages();
    try {
      if (editingUser) {
        await updateUser(authToken, editingUser.id, userFormValues);
        resetUserForm();
        setSuccess('Usuario actualizado correctamente.');
      } else {
        await createUser(authToken, { ...userFormValues, activo: true });
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
    clearMessages();
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
    clearMessages();
    try {
      if (editingRegla) {
        await updateReglaSanitaria(authToken, editingRegla.id, reglaFormValues);
        resetReglaForm();
        setSuccess('Regla sanitaria actualizada correctamente.');
      } else {
        await createReglaSanitaria(authToken, { ...reglaFormValues, activo: true });
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
    clearMessages();
    try {
      if (editingAlimento) {
        await updateAlimento(authToken, editingAlimento.id, alimentoFormValues);
        resetAlimentoForm();
        setSuccess('Alimento actualizado correctamente.');
      } else {
        await createAlimento(authToken, { ...alimentoFormValues, activo: true });
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
    clearMessages();
    try {
      if (editingReglaAlimentacion) {
        await updateReglaAlimentacion(authToken, editingReglaAlimentacion.id, reglaAlimentacionFormValues);
        resetReglaAlimentacionForm();
        setSuccess('Regla de alimentación actualizada correctamente.');
      } else {
        await createReglaAlimentacion(authToken, { ...reglaAlimentacionFormValues, activo: true });
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

  async function setLoteActive(lote: Lote, activo: boolean) {
    if (!authToken) return onUnauthorized();
    if (!activo && !confirmLogicalDelete()) return;
    clearMessages();
    try {
      await updateLote(authToken, lote.id, {
        nombre: lote.nombre,
        descripcion: lote.descripcion ?? '',
        activo,
      });
      setSuccess(activo ? 'Lote reactivado correctamente.' : 'Lote dado de baja correctamente.');
      await loadLotes();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  async function setReglaActive(regla: ReglaSanitaria, activo: boolean) {
    if (!authToken) return onUnauthorized();
    if (!activo && !confirmLogicalDelete()) return;
    clearMessages();
    try {
      await updateReglaSanitaria(authToken, regla.id, {
        nombre: regla.nombre,
        codigo: regla.codigo,
        tipo: regla.tipo,
        mesFijo: regla.mesFijo ? String(regla.mesFijo) : '',
        frecuenciaMeses: String(regla.frecuenciaMeses),
        anticipacionMeses: String(regla.anticipacionMeses),
        activo,
        observaciones: regla.observaciones ?? '',
      });
      setSuccess(activo ? 'Regla sanitaria reactivada correctamente.' : 'Regla sanitaria dada de baja correctamente.');
      await loadReglas();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  async function setAlimentoActive(alimento: Alimento, activo: boolean) {
    if (!authToken) return onUnauthorized();
    if (!activo && !confirmLogicalDelete()) return;
    clearMessages();
    try {
      await updateAlimento(authToken, alimento.id, {
        nombre: alimento.nombre,
        tipoAlimento: alimento.tipoAlimento,
        unidad: alimento.unidadMedida,
        stockActual: String(alimento.stockActual),
        puntoStockMinimo: String(alimento.stockMinimo),
        activo,
        observaciones: alimento.descripcion ?? '',
      });
      setSuccess(activo ? 'Alimento reactivado correctamente.' : 'Alimento dado de baja correctamente.');
      await loadAlimentacionConfig();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  async function setReglaAlimentacionActive(regla: ReglaAlimentacion, activo: boolean) {
    if (!authToken) return onUnauthorized();
    if (!activo && !confirmLogicalDelete()) return;
    clearMessages();
    try {
      await updateReglaAlimentacion(authToken, regla.id, {
        nombre: regla.nombre,
        categoriaAnimal: regla.categoriaAnimal,
        activo,
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
      setSuccess(activo ? 'Regla de alimentación reactivada correctamente.' : 'Regla de alimentación dada de baja correctamente.');
      await loadAlimentacionConfig();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  function renderStatus(active: boolean, activeLabel = 'ACTIVO', inactiveLabel = 'INACTIVO') {
    return <span className={`status-pill ${active ? 'status-active' : 'status-inactive'}`}>{active ? activeLabel : inactiveLabel}</span>;
  }

  if (!isAdmin) {
    return (
      <div className="placeholder-page">
        <h2>Configuración</h2>
        <p>No tenés permisos para administrar configuración.</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Configuración</h2>
          <p>Usuarios, lotes, reglas sanitarias y alimentación del sistema.</p>
        </div>
        <div className="settings-summary">
          <strong>{summaryCount}</strong>
          <span>{summaryLabel}</span>
        </div>
      </section>

      <div className="settings-tabs" role="tablist">
        {[
          ['usuarios', 'Usuarios'],
          ['lotes', 'Lotes'],
          ['vacunas', 'Vacunas'],
          ['alimentacion', 'Alimentación'],
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'settings-tab-active' : ''}
            onClick={() => {
              setActiveTab(tab as SettingsTab);
              clearMessages();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      {activeTab === 'usuarios' && (
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
          </form>
          {isLoading ? <p className="table-empty">Cargando usuarios...</p> : (
            <div className="table-wrap">
              <table className="users-table">
                <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{visibleUsers.map((user) => <tr key={user.id}><td><strong>{user.nombre}</strong><span>{user.username}</span></td><td>{user.email ?? '-'}</td><td>{user.rol}</td><td>{renderStatus(user.activo)}</td><td><div className="table-actions"><button type="button" onClick={() => startEditingUser(user)} aria-label={`Editar ${user.username}`}><Edit2 size={16} /></button>{user.activo ? <button type="button" onClick={() => void setUserActive(user, false)} aria-label={`Dar de baja ${user.username}`}><Trash2 size={16} /></button> : <button type="button" onClick={() => void setUserActive(user, true)} aria-label={`Reactivar ${user.username}`}><RotateCcw size={16} /></button>}</div></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'lotes' && (
        <section className="panel users-list-panel">
          <div className="panel-header">
            <div><h2>Lotes</h2><p>{visibleLotes.length} de {lotes.length} lotes registrados.</p></div>
            <div className="header-actions">
              <button type="button" className="secondary-button" onClick={openNewLoteModal}><Plus size={16} /> Nuevo lote</button>
              <button type="button" className="icon-button" onClick={() => void loadLotes()} aria-label="Actualizar lotes"><RefreshCcw size={18} /></button>
            </div>
          </div>
          <form className="filters-form events-filters production-filters">
            <label className="filter-field"><span>Buscar</span><input value={loteFilters.buscar} onChange={(event) => setLoteFilters({ ...loteFilters, buscar: event.target.value })} placeholder="Nombre o descripción" /></label>
            <label className="filter-field"><span>Estado</span><select value={loteFilters.estado} onChange={(event) => setLoteFilters({ ...loteFilters, estado: event.target.value as EstadoFilter })}><option value="">Todos</option><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
            <label className="filter-field"><span>Animales mín.</span><input type="number" min="0" value={loteFilters.minAnimales} onChange={(event) => setLoteFilters({ ...loteFilters, minAnimales: event.target.value })} /></label>
            <label className="filter-field"><span>Animales máx.</span><input type="number" min="0" value={loteFilters.maxAnimales} onChange={(event) => setLoteFilters({ ...loteFilters, maxAnimales: event.target.value })} /></label>
          </form>
          {isLoading ? <p className="table-empty">Cargando lotes...</p> : (
            <div className="table-wrap">
              <table className="users-table">
                <thead><tr><th>Lote</th><th>Animales</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{visibleLotes.map((lote) => <tr key={lote.id}><td><strong>{lote.nombre}</strong><span>{lote.descripcion || 'Sin descripción'}</span></td><td>{lote.cantidadAnimales}</td><td>{renderStatus(lote.activo)}</td><td><div className="table-actions"><button type="button" onClick={() => startEditingLote(lote)} aria-label={`Editar ${lote.nombre}`}><Edit2 size={16} /></button>{lote.activo ? <button type="button" onClick={() => void setLoteActive(lote, false)} aria-label={`Dar de baja ${lote.nombre}`}><Trash2 size={16} /></button> : <button type="button" onClick={() => void setLoteActive(lote, true)} aria-label={`Reactivar ${lote.nombre}`}><RotateCcw size={16} /></button>}</div></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'vacunas' && (
        <section className="panel users-list-panel">
          <div className="panel-header">
            <div><h2>Vacunas / Reglas Sanitarias</h2><p>{visibleReglas.length} de {reglas.length} reglas registradas.</p></div>
            <div className="header-actions">
              <button type="button" className="secondary-button" onClick={openNewReglaModal}><Plus size={16} /> Nueva vacuna / regla sanitaria</button>
              <button type="button" className="icon-button" onClick={() => void loadReglas()} aria-label="Actualizar reglas sanitarias"><RefreshCcw size={18} /></button>
            </div>
          </div>
          <form className="filters-form events-filters production-filters">
            <label className="filter-field"><span>Buscar</span><input value={reglaFilters.buscar} onChange={(event) => setReglaFilters({ ...reglaFilters, buscar: event.target.value })} placeholder="Nombre o código" /></label>
            <label className="filter-field"><span>Estado</span><select value={reglaFilters.estado} onChange={(event) => setReglaFilters({ ...reglaFilters, estado: event.target.value as EstadoFilter })}><option value="">Todas</option><option value="true">Activa</option><option value="false">Inactiva</option></select></label>
            <label className="filter-field"><span>Tipo</span><select value={reglaFilters.tipo} onChange={(event) => setReglaFilters({ ...reglaFilters, tipo: event.target.value })}><option value="">Todos</option><option value="VACUNA">VACUNA</option><option value="ANALISIS">ANALISIS</option></select></label>
            <label className="filter-field"><span>Frecuencia</span><select value={reglaFilters.frecuencia} onChange={(event) => setReglaFilters({ ...reglaFilters, frecuencia: event.target.value })}><option value="">Todas</option>{availableFrequencies.map((frecuencia) => <option key={frecuencia} value={frecuencia}>{frecuencia} meses</option>)}</select></label>
          </form>
          {isLoading ? <p className="table-empty">Cargando reglas...</p> : (
            <div className="table-wrap">
              <table className="users-table">
                <thead><tr><th>Regla</th><th>Tipo</th><th>Frecuencia</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{visibleReglas.map((regla) => <tr key={regla.id}><td><strong>{regla.nombre}</strong><span>{regla.codigo}</span></td><td>{regla.tipo}</td><td>{regla.mesFijo ? `Mes ${regla.mesFijo}` : `Cada ${regla.frecuenciaMeses} meses`} · anticipa {regla.anticipacionMeses}</td><td>{renderStatus(regla.activo, 'ACTIVA', 'INACTIVA')}</td><td><div className="table-actions"><button type="button" onClick={() => startEditingRegla(regla)} aria-label={`Editar ${regla.codigo}`}><Edit2 size={16} /></button>{regla.activo ? <button type="button" onClick={() => void setReglaActive(regla, false)} aria-label={`Dar de baja ${regla.codigo}`}><Trash2 size={16} /></button> : <button type="button" onClick={() => void setReglaActive(regla, true)} aria-label={`Reactivar ${regla.codigo}`}><RotateCcw size={16} /></button>}</div></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'alimentacion' && (
        <>
          <section className="panel users-list-panel">
            <div className="panel-header">
              <div><h2>Alimentos / Insumos</h2><p>{visibleAlimentos.length} de {alimentos.length} alimentos cargados.</p></div>
              <div className="header-actions">
                <button type="button" className="secondary-button" onClick={openNewAlimentoModal}><Plus size={16} /> Nuevo alimento</button>
                <button type="button" className="icon-button" onClick={() => void loadAlimentacionConfig()} aria-label="Actualizar alimentación"><RefreshCcw size={18} /></button>
              </div>
            </div>
            <form className="filters-form events-filters production-filters">
              <label className="filter-field"><span>Buscar</span><input value={alimentoFilters.buscar} onChange={(event) => setAlimentoFilters({ ...alimentoFilters, buscar: event.target.value })} placeholder="Nombre" /></label>
              <label className="filter-field"><span>Estado</span><select value={alimentoFilters.estado} onChange={(event) => setAlimentoFilters({ ...alimentoFilters, estado: event.target.value as EstadoFilter })}><option value="">Todos</option><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
              <label className="filter-field"><span>Tipo</span><select value={alimentoFilters.tipoAlimento} onChange={(event) => setAlimentoFilters({ ...alimentoFilters, tipoAlimento: event.target.value })}><option value="">Todos</option>{availableAlimentoTypes.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></label>
            </form>
            {isLoading ? <p className="table-empty">Cargando configuración...</p> : (
              <div className="table-wrap">
                <table className="users-table">
                  <thead><tr><th>Alimento</th><th>Tipo</th><th>Unidad</th><th>Stock actual</th><th>Punto mínimo</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>{visibleAlimentos.map((alimento) => <tr key={alimento.id}><td><strong>{alimento.nombre}</strong><span>{alimento.descripcion || '-'}</span></td><td>{alimento.tipoAlimento}</td><td>{alimento.unidadMedida}</td><td>{alimento.stockActual}</td><td>{alimento.stockMinimo}</td><td>{renderStatus(alimento.activo)}</td><td><div className="table-actions"><button type="button" onClick={() => startEditingAlimento(alimento)} aria-label={`Editar ${alimento.nombre}`}><Edit2 size={16} /></button>{alimento.activo ? <button type="button" onClick={() => void setAlimentoActive(alimento, false)} aria-label={`Dar de baja ${alimento.nombre}`}><Trash2 size={16} /></button> : <button type="button" onClick={() => void setAlimentoActive(alimento, true)} aria-label={`Reactivar ${alimento.nombre}`}><RotateCcw size={16} /></button>}</div></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel users-list-panel">
            <div className="panel-header">
              <div><h2>Reglas Alimentarias</h2><p>{visibleReglasAlimentacion.length} de {reglasAlimentacion.length} reglas configuradas.</p></div>
              <button type="button" className="secondary-button" onClick={openNewReglaAlimentacionModal}><Plus size={16} /> Nueva regla</button>
            </div>
            <form className="filters-form events-filters production-filters">
              <label className="filter-field"><span>Buscar</span><input value={reglaAlimentacionFilters.buscar} onChange={(event) => setReglaAlimentacionFilters({ ...reglaAlimentacionFilters, buscar: event.target.value })} placeholder="Nombre de regla" /></label>
              <label className="filter-field"><span>Estado</span><select value={reglaAlimentacionFilters.estado} onChange={(event) => setReglaAlimentacionFilters({ ...reglaAlimentacionFilters, estado: event.target.value as EstadoFilter })}><option value="">Todas</option><option value="true">Activa</option><option value="false">Inactiva</option></select></label>
              <label className="filter-field"><span>Categoría</span><select value={reglaAlimentacionFilters.categoriaAnimal} onChange={(event) => setReglaAlimentacionFilters({ ...reglaAlimentacionFilters, categoriaAnimal: event.target.value })}><option value="">Todas</option>{availableCategoriasReglas.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}</select></label>
            </form>
            <div className="table-wrap settings-secondary-table">
              <table className="users-table">
                <thead><tr><th>Regla</th><th>Categoría</th><th>Alimentos incluidos</th><th>Resumen</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{visibleReglasAlimentacion.map((regla) => <tr key={regla.id}><td><strong>{regla.nombre}</strong><span>{regla.observaciones || '-'}</span></td><td>{regla.categoriaAnimal}</td><td>{regla.detalles.length}</td><td>{regla.detalles.map((detalle) => detalle.alimento.nombre).join(', ') || '-'}</td><td>{renderStatus(regla.activo, 'ACTIVA', 'INACTIVA')}</td><td><div className="table-actions"><button type="button" onClick={() => startEditingReglaAlimentacion(regla)} aria-label={`Editar ${regla.nombre}`}><Edit2 size={16} /></button>{regla.activo ? <button type="button" onClick={() => void setReglaAlimentacionActive(regla, false)} aria-label={`Dar de baja ${regla.nombre}`}><Trash2 size={16} /></button> : <button type="button" onClick={() => void setReglaAlimentacionActive(regla, true)} aria-label={`Reactivar ${regla.nombre}`}><RotateCcw size={16} /></button>}</div></td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {showUserModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div><h2>{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h2><p>{editingUser ? 'La password solo cambia si completás el campo.' : 'El usuario se crea activo automáticamente.'}</p></div>
              <button type="button" className="icon-button" onClick={resetUserForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleUserSubmit}>
              <label><span>Nombre</span><input value={userFormValues.nombre} onChange={(event) => setUserFormValues({ ...userFormValues, nombre: event.target.value })} required /></label>
              <label><span>Username</span><input value={userFormValues.username} onChange={(event) => setUserFormValues({ ...userFormValues, username: event.target.value })} required /></label>
              <label><span>Email</span><input type="email" value={userFormValues.email} onChange={(event) => setUserFormValues({ ...userFormValues, email: event.target.value })} /></label>
              <label><span>Password</span><input type="password" value={userFormValues.password} onChange={(event) => setUserFormValues({ ...userFormValues, password: event.target.value })} required={!editingUser} placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''} /></label>
              <label><span>Rol</span><select value={userFormValues.rol} onChange={(event) => setUserFormValues({ ...userFormValues, rol: event.target.value as UserRole })}><option value="ADMIN">ADMIN</option><option value="EMPLEADO">EMPLEADO</option></select></label>
              {editingUser && <label><span>Estado</span><select value={userFormValues.activo ? 'true' : 'false'} onChange={(event) => setUserFormValues({ ...userFormValues, activo: event.target.value === 'true' })}><option value="true">ACTIVO</option><option value="false">INACTIVO</option></select></label>}
              <div className="modal-actions animal-form-actions"><button type="button" className="secondary-button" onClick={resetUserForm}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </section>
        </div>
      )}

      {showLoteModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div><h2>{editingLote ? 'Editar lote' : 'Nuevo lote'}</h2><p>{editingLote ? 'Datos del lote y estado operativo.' : 'El lote se crea activo automáticamente.'}</p></div>
              <button type="button" className="icon-button" onClick={resetLoteForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleLoteSubmit}>
              <label><span>Nombre</span><input value={loteFormValues.nombre} onChange={(event) => setLoteFormValues({ ...loteFormValues, nombre: event.target.value })} required /></label>
              <label className="animal-form-message"><span>Descripción</span><textarea rows={3} value={loteFormValues.descripcion} onChange={(event) => setLoteFormValues({ ...loteFormValues, descripcion: event.target.value })} /></label>
              {editingLote && <label><span>Estado</span><select value={loteFormValues.activo ? 'true' : 'false'} onChange={(event) => setLoteFormValues({ ...loteFormValues, activo: event.target.value === 'true' })}><option value="true">ACTIVO</option><option value="false">INACTIVO</option></select></label>}
              <div className="modal-actions animal-form-actions"><button type="button" className="secondary-button" onClick={resetLoteForm}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </section>
        </div>
      )}

      {showReglaModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div><h2>{editingRegla ? 'Editar vacuna / regla sanitaria' : 'Nueva vacuna / regla sanitaria'}</h2><p>{editingRegla ? 'Datos sanitarios y estado.' : 'La regla se crea activa automáticamente.'}</p></div>
              <button type="button" className="icon-button" onClick={resetReglaForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleReglaSubmit}>
              <label><span>Nombre</span><input value={reglaFormValues.nombre} onChange={(event) => setReglaFormValues({ ...reglaFormValues, nombre: event.target.value })} required /></label>
              <label><span>Código</span><input value={reglaFormValues.codigo} onChange={(event) => setReglaFormValues({ ...reglaFormValues, codigo: event.target.value })} required /></label>
              <label><span>Tipo</span><select value={reglaFormValues.tipo} onChange={(event) => setReglaFormValues({ ...reglaFormValues, tipo: event.target.value as TipoReglaSanitaria })}><option value="VACUNA">VACUNA</option><option value="ANALISIS">ANALISIS</option></select></label>
              <label><span>Mes fijo</span><input type="number" min="1" max="12" value={reglaFormValues.mesFijo} onChange={(event) => setReglaFormValues({ ...reglaFormValues, mesFijo: event.target.value })} placeholder="Opcional" /></label>
              <label><span>Frecuencia meses</span><input type="number" min="1" value={reglaFormValues.frecuenciaMeses} onChange={(event) => setReglaFormValues({ ...reglaFormValues, frecuenciaMeses: event.target.value })} required /></label>
              <label><span>Anticipación meses</span><input type="number" min="1" value={reglaFormValues.anticipacionMeses} onChange={(event) => setReglaFormValues({ ...reglaFormValues, anticipacionMeses: event.target.value })} required /></label>
              {editingRegla && <label><span>Estado</span><select value={reglaFormValues.activo ? 'true' : 'false'} onChange={(event) => setReglaFormValues({ ...reglaFormValues, activo: event.target.value === 'true' })}><option value="true">ACTIVA</option><option value="false">INACTIVA</option></select></label>}
              <label className="animal-form-message"><span>Observaciones</span><textarea rows={3} value={reglaFormValues.observaciones} onChange={(event) => setReglaFormValues({ ...reglaFormValues, observaciones: event.target.value })} /></label>
              <div className="modal-actions animal-form-actions"><button type="button" className="secondary-button" onClick={resetReglaForm}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </section>
        </div>
      )}

      {showAlimentoModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div><h2>{editingAlimento ? 'Editar alimento' : 'Nuevo alimento'}</h2><p>{editingAlimento ? 'Datos maestros y estado del insumo.' : 'El alimento se crea activo automáticamente.'}</p></div>
              <button type="button" className="icon-button" onClick={resetAlimentoForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleAlimentoSubmit}>
              <label><span>Nombre</span><input value={alimentoFormValues.nombre} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, nombre: event.target.value })} required /></label>
              <label><span>Tipo de alimento</span><select value={alimentoFormValues.tipoAlimento} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, tipoAlimento: event.target.value as AlimentoFormValues['tipoAlimento'] })}>{tipoAlimentoOptions.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></label>
              <label><span>Unidad</span><select value={alimentoFormValues.unidad} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, unidad: event.target.value as AlimentoFormValues['unidad'] })}><option value="KG">KG</option><option value="ROLLO">ROLLO</option><option value="UNIDAD">UNIDAD</option></select></label>
              <label><span>Stock actual</span><input type="number" min="0" step="0.01" value={alimentoFormValues.stockActual} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, stockActual: event.target.value })} required /></label>
              <label><span>Punto stock mínimo</span><input type="number" min="0" step="0.01" value={alimentoFormValues.puntoStockMinimo} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, puntoStockMinimo: event.target.value })} required /></label>
              {editingAlimento && <label><span>Estado</span><select value={alimentoFormValues.activo ? 'true' : 'false'} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, activo: event.target.value === 'true' })}><option value="true">ACTIVO</option><option value="false">INACTIVO</option></select></label>}
              <label className="animal-form-message"><span>Observaciones</span><textarea rows={3} value={alimentoFormValues.observaciones} onChange={(event) => setAlimentoFormValues({ ...alimentoFormValues, observaciones: event.target.value })} /></label>
              <div className="modal-actions animal-form-actions"><button type="button" className="secondary-button" onClick={resetAlimentoForm}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </section>
        </div>
      )}

      {showReglaAlimentacionModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel modal-panel-wide animal-form-modal">
            <div className="panel-header">
              <div><h2>{editingReglaAlimentacion ? 'Editar regla' : 'Nueva regla'}</h2><p>Dieta completa por categoría con varios alimentos.</p></div>
              <button type="button" className="icon-button" onClick={resetReglaAlimentacionForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form" onSubmit={handleReglaAlimentacionSubmit}>
              <div className="feed-registration-form">
                <label><span>Nombre de la regla</span><input value={reglaAlimentacionFormValues.nombre} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, nombre: event.target.value })} required /></label>
                <label><span>Categoría</span><select value={reglaAlimentacionFormValues.categoriaAnimal} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, categoriaAnimal: event.target.value as ReglaAlimentacionFormValues['categoriaAnimal'] })} required><option value="">Seleccionar</option>{categoriaOptions.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}</select></label>
                {editingReglaAlimentacion && <label><span>Estado</span><select value={reglaAlimentacionFormValues.activo ? 'true' : 'false'} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, activo: event.target.value === 'true' })}><option value="true">ACTIVA</option><option value="false">INACTIVA</option></select></label>}
                <label className="form-wide"><span>Observaciones</span><textarea rows={2} value={reglaAlimentacionFormValues.observaciones} onChange={(event) => setReglaAlimentacionFormValues({ ...reglaAlimentacionFormValues, observaciones: event.target.value })} /></label>
              </div>
              <div className="panel-header panel-header-spaced">
                <div><h2>Alimentos de la regla</h2><p>{reglaAlimentacionFormValues.detalles.length} alimentos asociados.</p></div>
                <button type="button" className="secondary-button" onClick={addDetalleRegla}><Plus size={16} /> Agregar alimento a la regla</button>
              </div>
              <div className="table-wrap">
                <table className="users-table">
                  <thead><tr><th>Alimento</th><th>Tipo cálculo</th><th>Unidad</th><th>Min</th><th>Max</th><th>Animales base</th><th>Rollos base</th><th>Días</th><th>Oblig.</th><th>Observaciones</th><th></th></tr></thead>
                  <tbody>{reglaAlimentacionFormValues.detalles.map((detalle, index) => <tr key={`${index}-${detalle.alimentoId}`}><td><select className="table-input" value={detalle.alimentoId} onChange={(event) => updateDetalleRegla(index, { alimentoId: event.target.value })}><option value="">Seleccionar</option>{alimentos.filter((alimento) => alimento.activo || alimento.id === Number(detalle.alimentoId)).map((alimento) => <option key={alimento.id} value={alimento.id}>{alimento.nombre}</option>)}</select></td><td><select className="table-input" value={detalle.tipoCalculo} onChange={(event) => updateDetalleRegla(index, { tipoCalculo: event.target.value as DetalleReglaAlimentacionFormValues['tipoCalculo'] })}><option value="KG_POR_ANIMAL_DIA">KG/animal/día</option><option value="ROLLOS_POR_GRUPO_DURACION">Rollos/grupo</option><option value="OBLIGATORIO_SIN_CANTIDAD">Obligatorio</option></select></td><td><select className="table-input" value={detalle.unidad} onChange={(event) => updateDetalleRegla(index, { unidad: event.target.value as DetalleReglaAlimentacionFormValues['unidad'] })}><option value="KG">KG</option><option value="ROLLO">ROLLO</option><option value="UNIDAD">UNIDAD</option></select></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.cantidadMinima} onChange={(event) => updateDetalleRegla(index, { cantidadMinima: event.target.value })} /></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.cantidadMaxima} onChange={(event) => updateDetalleRegla(index, { cantidadMaxima: event.target.value })} /></td><td><input className="table-input" type="number" min="1" value={detalle.animalesBase} onChange={(event) => updateDetalleRegla(index, { animalesBase: event.target.value })} /></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.rollosBase} onChange={(event) => updateDetalleRegla(index, { rollosBase: event.target.value })} /></td><td><input className="table-input" type="number" min="1" value={detalle.duracionDias} onChange={(event) => updateDetalleRegla(index, { duracionDias: event.target.value })} /></td><td><input type="checkbox" checked={detalle.obligatorio} onChange={(event) => updateDetalleRegla(index, { obligatorio: event.target.checked })} /></td><td><input className="table-input" value={detalle.observaciones} onChange={(event) => updateDetalleRegla(index, { observaciones: event.target.value })} /></td><td><button type="button" className="icon-button" onClick={() => removeDetalleRegla(index)} aria-label="Quitar alimento"><Trash2 size={16} /></button></td></tr>)}</tbody>
                </table>
              </div>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={resetReglaAlimentacionForm}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar regla'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
