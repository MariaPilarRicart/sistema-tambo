import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, CheckCircle2, Edit2, Eye, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { compareByStatusThenName, formatDate, statusClass } from '../utils/display';
import { createCliente, getClientes, updateCliente, updateClienteEstado } from '../services/clientesService';
import {
  createEntregaLeche,
  createLiquidacionLeche,
  deleteEntregaLeche,
  getEntregasLeche,
  getLiquidacionesLeche,
  getOrdenesDisponiblesVenta,
  getResumenVentas,
  getSugerenciaLiquidacion,
  updateEntregaLeche,
  updateLiquidacionLeche,
} from '../services/ventasService';
import type { AuthUser } from '../types/auth';
import type { Cliente, ClienteCreateValues, ClienteEditValues } from '../types/clientes';
import type {
  EntregaFilters,
  EntregaFormValues,
  EntregaLeche,
  LiquidacionFilters,
  LiquidacionFormValues,
  LiquidacionLeche,
  SugerenciaLiquidacion,
  VentasResumen,
} from '../types/ventas';
import type { Ordene } from '../types/produccion';

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function currentMonth() {
  return String(new Date().getMonth() + 1);
}

function currentYear() {
  return String(new Date().getFullYear());
}

function toDateInputValue(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const emptyEntregaForm: EntregaFormValues = {
  clienteId: '',
  fechaRetiro: localDateValue(),
  ordeneIds: [],
  observacion: '',
};

const emptyLiquidacionForm: LiquidacionFormValues = {
  clienteId: '',
  mes: currentMonth(),
  anio: currentYear(),
  numero: '',
  fechaLiquidacion: localDateValue(),
  precioLitro: '',
  litrosLiquidados: '',
  observacion: '',
};

const emptyEntregaFilters: EntregaFilters = {
  clienteId: '',
  fechaDesde: '',
  fechaHasta: '',
  estado: '',
};

const emptyLiquidacionFilters: LiquidacionFilters = {
  clienteId: '',
  mes: '',
  anio: '',
};

const emptyClienteCreateForm: ClienteCreateValues = {
  cuit: '',
  razonSocial: '',
  direccion: '',
  telefono: '',
  email: '',
};

const monthOptions = [
  ['1', 'Enero'],
  ['2', 'Febrero'],
  ['3', 'Marzo'],
  ['4', 'Abril'],
  ['5', 'Mayo'],
  ['6', 'Junio'],
  ['7', 'Julio'],
  ['8', 'Agosto'],
  ['9', 'Septiembre'],
  ['10', 'Octubre'],
  ['11', 'Noviembre'],
  ['12', 'Diciembre'],
] as const;

const estadoEntregaLabels: Record<EntregaLeche['estado'], string> = {
  PENDIENTE: 'Pendiente de liquidar',
  LIQUIDADA: 'Liquidado',
  ANULADA: 'Anulado',
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
  return `${Number(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} l`;
}

function formatCurrency(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function clienteLabel(cliente: Cliente) {
  return `${cliente.cuit} - ${cliente.razonSocial}`;
}

function turnoLabel(turno: string) {
  const labels: Record<string, string> = {
    MANANA: 'Mañana',
    MAÑANA: 'Mañana',
    TARDE: 'Tarde',
    NOCHE: 'Noche',
  };
  return labels[turno] ?? turno;
}

function entregaLitros(entrega: EntregaLeche) {
  return entrega.ordenes.reduce((total, detalle) => total + Number(detalle.litrosEntregados ?? 0), 0);
}

function retiroCountLabel(count: number) {
  return `${count} ${count === 1 ? 'ordeñe' : 'ordeñes'}`;
}

function periodoLabel(mes: number | string, anio: number | string) {
  return `${monthOptions.find(([value]) => value === String(mes))?.[1] ?? mes} ${anio}`;
}

function liquidacionFormFromLiquidacion(liquidacion: LiquidacionLeche): LiquidacionFormValues {
  return {
    clienteId: String(liquidacion.clienteId),
    mes: String(liquidacion.mes),
    anio: String(liquidacion.anio),
    numero: liquidacion.numero,
    fechaLiquidacion: toDateInputValue(liquidacion.fechaLiquidacion),
    precioLitro: String(liquidacion.precioLitro ?? ''),
    litrosLiquidados: String(liquidacion.litrosLiquidados ?? ''),
    observacion: liquidacion.observacion ?? '',
  };
}

interface SalesPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function SalesPage({ authToken, currentUser, onUnauthorized }: SalesPageProps) {
  const [resumen, setResumen] = useState<VentasResumen | null>(null);
  const [entregas, setEntregas] = useState<EntregaLeche[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionLeche[]>([]);
  const [ordenesDisponibles, setOrdenesDisponibles] = useState<Ordene[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesSearch, setClientesSearch] = useState('');
  const [entregaFilters, setEntregaFilters] = useState<EntregaFilters>(emptyEntregaFilters);
  const [liquidacionFilters, setLiquidacionFilters] = useState<LiquidacionFilters>(emptyLiquidacionFilters);
  const [entregaForm, setEntregaForm] = useState<EntregaFormValues>(emptyEntregaForm);
  const [liquidacionForm, setLiquidacionForm] = useState<LiquidacionFormValues>(emptyLiquidacionForm);
  const [clienteCreateForm, setClienteCreateForm] = useState<ClienteCreateValues>(emptyClienteCreateForm);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [clienteEditForm, setClienteEditForm] = useState<ClienteEditValues | null>(null);
  const [editingEntrega, setEditingEntrega] = useState<EntregaLeche | null>(null);
  const [editingLiquidacion, setEditingLiquidacion] = useState<LiquidacionLeche | null>(null);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaLeche | null>(null);
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<LiquidacionLeche | null>(null);
  const [sugerenciaLiquidacion, setSugerenciaLiquidacion] = useState<SugerenciaLiquidacion | null>(null);
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [showLiquidacionModal, setShowLiquidacionModal] = useState(false);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [retiroFormError, setRetiroFormError] = useState('');
  const [liquidacionFormError, setLiquidacionFormError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const activeClientes = useMemo(() => clientes.filter((cliente) => cliente.activo), [clientes]);
  const sortedClientes = useMemo(
    () => [...clientes].sort((left, right) => compareByStatusThenName(
      left,
      right,
      (cliente) => (cliente.activo ? 'ACTIVO' : 'INACTIVO'),
      (cliente) => cliente.razonSocial,
    )),
    [clientes],
  );
  const selectedEntregaOrdeneIds = useMemo(() => new Set(entregaForm.ordeneIds), [entregaForm.ordeneIds]);
  const ordenesParaSelector = useMemo(() => {
    const currentOrdenes = editingEntrega?.ordenes.map((detalle) => detalle.ordene) ?? [];
    return Array.from(new Map([...currentOrdenes, ...ordenesDisponibles].map((ordene) => [ordene.id, ordene])).values())
      .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime());
  }, [editingEntrega, ordenesDisponibles]);
  const liquidacionImporte = Number(liquidacionForm.litrosLiquidados || 0) * Number(liquidacionForm.precioLitro || 0);

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
      const [nextResumen, nextEntregas, nextLiquidaciones, nextOrdenes, nextClientes] = await Promise.all([
        getResumenVentas(authToken),
        getEntregasLeche(authToken, entregaFilters),
        getLiquidacionesLeche(authToken, liquidacionFilters),
        getOrdenesDisponiblesVenta(authToken),
        getClientes(authToken, clientesSearch),
      ]);
      setResumen(nextResumen);
      setEntregas(nextEntregas);
      setLiquidaciones(nextLiquidaciones);
      setOrdenesDisponibles(nextOrdenes);
      setClientes(nextClientes);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar ventas.');
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshOrdenesDisponiblesForModal() {
    if (!authToken) return;
    try {
      setOrdenesDisponibles(await getOrdenesDisponiblesVenta(authToken));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onUnauthorized();
      } else {
        setRetiroFormError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los ordeñes disponibles.');
      }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, entregaFilters, liquidacionFilters, clientesSearch]);

  useDataChangedRefresh(loadData, [authToken, entregaFilters, liquidacionFilters, clientesSearch]);

  useEffect(() => {
    if (!authToken || editingLiquidacion || !showLiquidacionModal || !liquidacionForm.clienteId || !liquidacionForm.mes || !liquidacionForm.anio) {
      setSugerenciaLiquidacion(null);
      return;
    }
    void getSugerenciaLiquidacion(authToken, liquidacionForm.clienteId, liquidacionForm.mes, liquidacionForm.anio)
      .then((sugerencia) => {
        setSugerenciaLiquidacion(sugerencia);
        setLiquidacionForm((current) => current.litrosLiquidados ? current : { ...current, litrosLiquidados: String(sugerencia.litrosSugeridos) });
      })
      .catch(() => setSugerenciaLiquidacion(null));
  }, [authToken, editingLiquidacion, showLiquidacionModal, liquidacionForm.clienteId, liquidacionForm.mes, liquidacionForm.anio]);

  function resetEntregaForm() {
    setEntregaForm({ ...emptyEntregaForm, fechaRetiro: localDateValue(), ordeneIds: [] });
    setEditingEntrega(null);
  }

  function openEntregaModal() {
    resetEntregaForm();
    setShowEntregaModal(true);
    setRetiroFormError('');
    setError('');
    setSuccess('');
    void refreshOrdenesDisponiblesForModal();
  }

  function openEditEntrega(entrega: EntregaLeche) {
    setEditingEntrega(entrega);
    setEntregaForm({
      clienteId: String(entrega.clienteId),
      fechaRetiro: toDateInputValue(entrega.fechaRetiro),
      ordeneIds: entrega.ordenes.map((detalle) => String(detalle.ordeneId)),
      observacion: entrega.observacion ?? '',
    });
    setShowEntregaModal(true);
    setRetiroFormError('');
    setError('');
    setSuccess('');
    void refreshOrdenesDisponiblesForModal();
  }

  function closeEntregaModal() {
    setShowEntregaModal(false);
    setRetiroFormError('');
    resetEntregaForm();
  }

  function openLiquidacionModal() {
    setEditingLiquidacion(null);
    setLiquidacionForm({ ...emptyLiquidacionForm, mes: currentMonth(), anio: currentYear(), fechaLiquidacion: localDateValue() });
    setSugerenciaLiquidacion(null);
    setShowLiquidacionModal(true);
    setLiquidacionFormError('');
    setError('');
    setSuccess('');
  }

  function openEditLiquidacion(liquidacion: LiquidacionLeche) {
    setEditingLiquidacion(liquidacion);
    setLiquidacionForm(liquidacionFormFromLiquidacion(liquidacion));
    setSugerenciaLiquidacion(null);
    setShowLiquidacionModal(true);
    setLiquidacionFormError('');
    setError('');
    setSuccess('');
  }

  function closeLiquidacionModal() {
    setShowLiquidacionModal(false);
    setLiquidacionForm(emptyLiquidacionForm);
    setSugerenciaLiquidacion(null);
    setEditingLiquidacion(null);
    setLiquidacionFormError('');
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

  function toggleOrdene(ordeneId: number) {
    const value = String(ordeneId);
    setEntregaForm((current) => ({
      ...current,
      ordeneIds: current.ordeneIds.includes(value)
        ? current.ordeneIds.filter((id) => id !== value)
        : [...current.ordeneIds, value],
    }));
  }

  async function handleEntregaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setRetiroFormError('');
    setError('');
    setSuccess('');
    try {
      if (editingEntrega) {
        await updateEntregaLeche(authToken, editingEntrega.id, entregaForm);
        setSuccess('Retiro actualizado correctamente.');
      } else {
        await createEntregaLeche(authToken, entregaForm);
        setSuccess('Retiro registrado correctamente.');
      }
      closeEntregaModal();
      await loadData();
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.statusCode === 401) {
        onUnauthorized();
      } else {
        setRetiroFormError(saveError instanceof Error ? saveError.message : (editingEntrega ? 'No se pudo actualizar el retiro.' : 'No se pudo registrar el retiro.'));
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEntrega(entrega: EntregaLeche) {
    if (!authToken) return onUnauthorized();
    if (!window.confirm('¿Deseás eliminar este retiro de leche? Los ordeñes quedarán disponibles nuevamente.')) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await deleteEntregaLeche(authToken, entrega.id);
      setSuccess('Retiro eliminado correctamente.');
      await loadData();
    } catch (deleteError) {
      handleRequestError(deleteError, 'No se pudo eliminar el retiro.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLiquidacionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    const isEditingLiquidacion = Boolean(editingLiquidacion);
    setIsSaving(true);
    setLiquidacionFormError('');
    setError('');
    setSuccess('');
    try {
      if (editingLiquidacion) {
        await updateLiquidacionLeche(authToken, editingLiquidacion.id, liquidacionForm);
      } else {
        await createLiquidacionLeche(authToken, liquidacionForm);
      }
      closeLiquidacionModal();
      setSuccess(isEditingLiquidacion ? 'Liquidación actualizada correctamente.' : 'Liquidación única registrada correctamente.');
      await loadData();
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.statusCode === 401) {
        onUnauthorized();
      } else {
        setLiquidacionFormError(saveError instanceof Error ? saveError.message : (editingLiquidacion ? 'No se pudo actualizar la liquidación.' : 'No se pudo registrar la liquidación.'));
      }
    } finally {
      setIsSaving(false);
    }
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
      setSuccess('Empresa compradora creada correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo crear la empresa.');
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
      setSuccess('Empresa actualizada correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo actualizar la empresa.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClienteBaja(cliente: Cliente) {
    if (!authToken) return onUnauthorized();
    if (!window.confirm('¿Deseás dar de baja esta empresa?')) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateClienteEstado(authToken, cliente.id, false);
      setSuccess('Empresa dada de baja correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo dar de baja la empresa.');
    } finally {
      setIsSaving(false);
    }
  }

  function startEditingCliente(cliente: Cliente) {
    setEditingCliente(cliente);
    setClienteEditForm(editValuesFromCliente(cliente));
    setError('');
    setSuccess('');
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Ventas</h2>
          <p>Control de retiros de leche y liquidaciones mensuales por empresa.</p>
        </div>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="operative-summary-grid">
        <article className="metric-card operative-card"><div className="metric-icon metric-icon-blue"><Building2 size={20} /></div><p className="metric-title">Litros entregados del mes</p><strong className="metric-value">{formatLiters(resumen?.litrosEntregadosMes)}</strong></article>
        <article className="metric-card operative-card"><div className="metric-icon metric-icon-amber"><CalendarClock size={20} /></div><p className="metric-title">Pendientes de liquidar</p><strong className="metric-value">{resumen?.retirosPendientes ?? 0}</strong></article>
        <article className="metric-card operative-card"><div className="metric-icon metric-icon-emerald"><CheckCircle2 size={20} /></div><p className="metric-title">Liquidaciones del mes</p><strong className="metric-value">{resumen?.liquidacionesMes ?? 0}</strong></article>
        <article className="metric-card operative-card"><div className="metric-icon metric-icon-indigo"><Save size={20} /></div><p className="metric-title">Importe liquidado del mes</p><strong className="metric-value">{formatCurrency(resumen?.importeLiquidadoMes)}</strong></article>
      </div>

      <section className="panel" id="historial-ventas-section">
        <div className="panel-header">
          <div>
            <h2>Retiros de leche</h2>
            <p>{entregas.length} retiros encontrados.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={openEntregaModal}><Plus size={16} />Registrar retiro</button>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar retiros"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field"><span>Empresa</span><select value={entregaFilters.clienteId} onChange={(event) => setEntregaFilters({ ...entregaFilters, clienteId: event.target.value })}><option value="">Todas</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.razonSocial}</option>)}</select></label>
          <label className="filter-field"><span>Fecha desde</span><input type="date" value={entregaFilters.fechaDesde} onChange={(event) => setEntregaFilters({ ...entregaFilters, fechaDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha hasta</span><input type="date" value={entregaFilters.fechaHasta} onChange={(event) => setEntregaFilters({ ...entregaFilters, fechaHasta: event.target.value })} /></label>
          <label className="filter-field"><span>Estado</span><select value={entregaFilters.estado} onChange={(event) => setEntregaFilters({ ...entregaFilters, estado: event.target.value })}><option value="">Todos</option><option value="PENDIENTE">Pendiente</option><option value="LIQUIDADA">Liquidado</option><option value="ANULADA">Anulado</option></select></label>
          <button type="button" className="secondary-button" onClick={() => setEntregaFilters(emptyEntregaFilters)}>Limpiar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando retiros...</p> : (
          <div className="table-wrap">
            <table className="users-table production-history-table">
              <thead><tr><th>Fecha de retiro</th><th>Empresa</th><th>Ordeñes incluidos</th><th>Litros entregados</th><th>Estado</th><th>Observaciones</th><th>Acciones</th></tr></thead>
              <tbody>
                {entregas.map((entrega) => (
                  <tr key={entrega.id} className={entrega.estado === 'ANULADA' ? 'stock-inactive-row' : undefined}>
                    <td>{formatDate(entrega.fechaRetiro)}</td>
                    <td>{entrega.cliente.razonSocial}</td>
                    <td>{entrega.ordenes.length} {entrega.ordenes.length === 1 ? 'ordeñe' : 'ordeñes'}</td>
                    <td><strong>{formatLiters(entregaLitros(entrega))}</strong></td>
                    <td><span className={`status-pill ${statusClass(entrega.estado)}`}>{estadoEntregaLabels[entrega.estado]}</span></td>
                    <td>{entrega.observacion ?? '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => setSelectedEntrega(entrega)} aria-label="Ver detalle de retiro"><Eye size={16} /></button>
                        {entrega.estado === 'PENDIENTE' && <button type="button" onClick={() => openEditEntrega(entrega)} aria-label="Editar retiro"><Edit2 size={16} /></button>}
                        {(entrega.estado === 'PENDIENTE' || entrega.estado === 'ANULADA') && <button type="button" onClick={() => void handleDeleteEntrega(entrega)} aria-label="Eliminar retiro"><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {entregas.length === 0 && <tr><td colSpan={7}>Sin retiros de leche registrados.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Liquidaciones únicas</h2>
            <p>{liquidaciones.length} liquidaciones encontradas.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={openLiquidacionModal}><Plus size={16} />Nueva liquidación</button>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar liquidaciones"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field"><span>Empresa</span><select value={liquidacionFilters.clienteId} onChange={(event) => setLiquidacionFilters({ ...liquidacionFilters, clienteId: event.target.value })}><option value="">Todas</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.razonSocial}</option>)}</select></label>
          <label className="filter-field"><span>Mes</span><select value={liquidacionFilters.mes} onChange={(event) => setLiquidacionFilters({ ...liquidacionFilters, mes: event.target.value })}><option value="">Todos</option>{monthOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Año</span><input value={liquidacionFilters.anio} onChange={(event) => setLiquidacionFilters({ ...liquidacionFilters, anio: event.target.value })} placeholder={currentYear()} /></label>
          <button type="button" className="secondary-button" onClick={() => setLiquidacionFilters(emptyLiquidacionFilters)}>Limpiar</button>
        </form>
        <div className="table-wrap">
          <table className="users-table production-history-table">
            <thead><tr><th>Período</th><th>Empresa</th><th>Número</th><th>Fecha</th><th>Litros liquidados</th><th>Precio por litro</th><th>Importe total</th><th>Acciones</th></tr></thead>
            <tbody>
              {liquidaciones.map((liquidacion) => (
                <tr key={liquidacion.id}>
                  <td>{periodoLabel(liquidacion.mes, liquidacion.anio)}</td>
                  <td>{liquidacion.cliente.razonSocial}</td>
                  <td><strong>{liquidacion.numero}</strong></td>
                  <td>{formatDate(liquidacion.fechaLiquidacion)}</td>
                  <td>{formatLiters(liquidacion.litrosLiquidados)}</td>
                  <td>{formatCurrency(liquidacion.precioLitro)}</td>
                  <td><strong>{formatCurrency(liquidacion.importeTotal)}</strong></td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="icon-button" onClick={() => setSelectedLiquidacion(liquidacion)} aria-label="Ver liquidación"><Eye size={16} /></button>
                      <button type="button" className="icon-button" onClick={() => openEditLiquidacion(liquidacion)} aria-label="Editar liquidación"><Edit2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {liquidaciones.length === 0 && <tr><td colSpan={8}>Sin liquidaciones registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" id="listado-clientes-section">
        <div className="panel-header">
          <div>
            <h2>Empresas compradoras</h2>
            <p>{sortedClientes.length} empresas encontradas.</p>
          </div>
          <div className="header-actions">
            {isAdmin && <button type="button" className="secondary-button" onClick={openClienteModal}><Plus size={16} />Nueva empresa</button>}
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar empresas"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field production-selector">
            <span>Buscar</span>
            <input placeholder="Buscar por CUIT o razón social..." value={clientesSearch} onChange={(event) => setClientesSearch(event.target.value)} />
          </label>
        </form>
        <div className="table-wrap feed-table-wrap">
          <table className="users-table">
            <thead><tr><th>CUIT</th><th>Razón social</th><th>Dirección</th><th>Teléfono</th><th>Email</th><th>Fecha alta</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {sortedClientes.map((cliente) => (
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
                      {isAdmin && <button type="button" onClick={() => startEditingCliente(cliente)} aria-label={`Editar ${cliente.razonSocial}`}><Edit2 size={16} /></button>}
                      {isAdmin && cliente.activo && <button type="button" onClick={() => void handleClienteBaja(cliente)} aria-label={`Dar de baja ${cliente.razonSocial}`}><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {sortedClientes.length === 0 && <tr><td colSpan={8}>Sin empresas cargadas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showEntregaModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel sale-modal">
            <div className="panel-header">
              <div>
                <h2>{editingEntrega ? 'Editar retiro' : 'Registrar retiro'}</h2>
                <p>Seleccioná uno o más ordeñes disponibles. Solo se entregan litros buenos.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeEntregaModal} aria-label="Cerrar retiro"><X size={18} /></button>
            </div>
            <form className="user-form production-form sale-form" onSubmit={handleEntregaSubmit}>
              {retiroFormError && <div className="form-error production-wide-field">{retiroFormError}</div>}
              <label><span>Empresa</span><select value={entregaForm.clienteId} onChange={(event) => setEntregaForm({ ...entregaForm, clienteId: event.target.value })} required><option value="">Seleccionar empresa</option>{activeClientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{clienteLabel(cliente)}</option>)}</select></label>
              <label><span>Fecha de retiro</span><input type="date" value={entregaForm.fechaRetiro} onChange={(event) => setEntregaForm({ ...entregaForm, fechaRetiro: event.target.value })} required /></label>
              <label className="production-wide-field"><span>Observación</span><textarea rows={2} value={entregaForm.observacion} onChange={(event) => setEntregaForm({ ...entregaForm, observacion: event.target.value })} /></label>
              <div className="production-wide-field table-wrap">
                <table className="users-table">
                  <thead><tr><th>Seleccionar</th><th>Fecha</th><th>Turno</th><th>Litros buenos</th></tr></thead>
                  <tbody>
                    {ordenesParaSelector.map((ordene) => (
                      <tr key={ordene.id}>
                        <td><input type="checkbox" checked={selectedEntregaOrdeneIds.has(String(ordene.id))} onChange={() => toggleOrdene(ordene.id)} /></td>
                        <td>{formatDate(ordene.fecha)}</td>
                        <td>{turnoLabel(ordene.turno)}</td>
                        <td><strong>{formatLiters(ordene.litrosBuenos)}</strong></td>
                      </tr>
                    ))}
                    {ordenesParaSelector.length === 0 && <tr><td colSpan={4}>No hay ordeñes disponibles para entregar.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="modal-actions production-wide-field">
                <button type="button" className="secondary-button" onClick={closeEntregaModal}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving || entregaForm.ordeneIds.length === 0}><Save size={18} />Guardar retiro</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showLiquidacionModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel sale-modal">
            <div className="panel-header">
              <div>
                <h2>{editingLiquidacion ? 'Editar liquidación' : 'Nueva liquidación'}</h2>
                <p>{editingLiquidacion ? 'Empresa, mes y año quedan fijos para conservar el período liquidado.' : 'Se carga mensualmente por empresa, cuando se conoce el precio por litro.'}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeLiquidacionModal} aria-label="Cerrar liquidación"><X size={18} /></button>
            </div>
            <form className="user-form production-form sale-form" onSubmit={handleLiquidacionSubmit}>
              {liquidacionFormError && <div className="form-error production-wide-field">{liquidacionFormError}</div>}
              <label><span>Empresa</span><select value={liquidacionForm.clienteId} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, clienteId: event.target.value, litrosLiquidados: '' })} required disabled={Boolean(editingLiquidacion)}><option value="">Seleccionar empresa</option>{(editingLiquidacion ? clientes : activeClientes).map((cliente) => <option key={cliente.id} value={cliente.id}>{clienteLabel(cliente)}</option>)}</select></label>
              <label><span>Mes</span><select value={liquidacionForm.mes} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, mes: event.target.value, litrosLiquidados: '' })} disabled={Boolean(editingLiquidacion)}>{monthOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Año</span><input value={liquidacionForm.anio} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, anio: event.target.value, litrosLiquidados: '' })} required readOnly={Boolean(editingLiquidacion)} /></label>
              <label><span>Número de liquidación</span><input value={liquidacionForm.numero} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, numero: event.target.value })} required /></label>
              <label><span>Fecha de liquidación</span><input type="date" value={liquidacionForm.fechaLiquidacion} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, fechaLiquidacion: event.target.value })} required /></label>
              <label><span>Precio por litro</span><input type="number" min="0.01" step="0.01" value={liquidacionForm.precioLitro} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, precioLitro: event.target.value })} required /></label>
              {!editingLiquidacion && <label><span>Litros sugeridos</span><input value={formatLiters(sugerenciaLiquidacion?.litrosSugeridos)} readOnly /></label>}
              <label><span>Litros liquidados</span><input type="number" min="0" step="0.01" value={liquidacionForm.litrosLiquidados} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, litrosLiquidados: event.target.value })} required /></label>
              <label><span>Importe total</span><input value={formatCurrency(liquidacionImporte)} readOnly /></label>
              <label className="production-wide-field"><span>Observación</span><textarea rows={2} value={liquidacionForm.observacion} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, observacion: event.target.value })} /></label>
              {!editingLiquidacion && <p className="table-empty production-wide-field">
                {sugerenciaLiquidacion ? `${sugerenciaLiquidacion.cantidadRetiros} retiros pendientes para el período.` : 'Seleccioná empresa y período para calcular litros sugeridos.'}
              </p>}
              <div className="modal-actions production-wide-field">
                <button type="button" className="secondary-button" onClick={closeLiquidacionModal}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving || !liquidacionForm.clienteId || Number(liquidacionForm.precioLitro) <= 0}><Save size={18} />{editingLiquidacion ? 'Guardar cambios' : 'Guardar liquidación'}</button>
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
                <h2>Nueva empresa compradora</h2>
                <p>CUIT y razón social quedan fijos al crear.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeClienteModal} aria-label="Cerrar nueva empresa"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleClienteCreate}>
              <label><span>CUIT</span><input value={clienteCreateForm.cuit} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, cuit: event.target.value })} required /></label>
              <label><span>Razón social / nombre</span><input value={clienteCreateForm.razonSocial} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, razonSocial: event.target.value })} required /></label>
              <label><span>Dirección</span><input value={clienteCreateForm.direccion} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, direccion: event.target.value })} /></label>
              <label><span>Teléfono</span><input value={clienteCreateForm.telefono} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, telefono: event.target.value })} /></label>
              <label><span>Email</span><input type="email" value={clienteCreateForm.email} onChange={(event) => setClienteCreateForm({ ...clienteCreateForm, email: event.target.value })} /></label>
              <div className="modal-actions animal-form-actions">
                <button type="button" className="secondary-button" onClick={closeClienteModal}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Save size={18} />Guardar empresa</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedEntrega && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Detalle del retiro</h2>
                <p>Ordeñes incluidos en este retiro de leche.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedEntrega(null)} aria-label="Cerrar detalle"><X size={18} /></button>
            </div>
            <div className="info-grid sale-detail-summary">
              <div className="info-item"><span>Empresa</span><strong>{selectedEntrega.cliente.razonSocial}</strong></div>
              <div className="info-item"><span>Fecha de retiro</span><strong>{formatDate(selectedEntrega.fechaRetiro)}</strong></div>
              <div className="info-item"><span>Total entregado</span><strong>{formatLiters(entregaLitros(selectedEntrega))}</strong></div>
              <div className="info-item"><span>Estado</span><strong>{estadoEntregaLabels[selectedEntrega.estado]}</strong></div>
            </div>
            <div className="table-wrap">
              <table className="users-table">
                <thead><tr><th>Fecha</th><th>Turno</th><th>Litros entregados</th></tr></thead>
                <tbody>
                  {selectedEntrega.ordenes.map((detalle) => (
                    <tr key={detalle.id}>
                      <td>{formatDate(detalle.ordene.fecha)}</td>
                      <td>{turnoLabel(detalle.ordene.turno)}</td>
                      <td><strong>{formatLiters(detalle.litrosEntregados)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {selectedLiquidacion && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Liquidación {selectedLiquidacion.numero}</h2>
                <p>{selectedLiquidacion.cliente.razonSocial} • {periodoLabel(selectedLiquidacion.mes, selectedLiquidacion.anio)}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedLiquidacion(null)} aria-label="Cerrar liquidación"><X size={18} /></button>
            </div>
            <div className="info-grid sale-detail-summary">
              <div className="info-item"><span>Empresa</span><strong>{selectedLiquidacion.cliente.razonSocial}</strong></div>
              <div className="info-item"><span>Período</span><strong>{periodoLabel(selectedLiquidacion.mes, selectedLiquidacion.anio)}</strong></div>
              <div className="info-item"><span>Número de liquidación</span><strong>{selectedLiquidacion.numero}</strong></div>
              <div className="info-item"><span>Fecha de liquidación</span><strong>{formatDate(selectedLiquidacion.fechaLiquidacion)}</strong></div>
              <div className="info-item"><span>Litros liquidados</span><strong>{formatLiters(selectedLiquidacion.litrosLiquidados)}</strong></div>
              <div className="info-item"><span>Precio por litro</span><strong>{formatCurrency(selectedLiquidacion.precioLitro)}</strong></div>
              <div className="info-item sale-total-item"><span>Importe total</span><strong>{formatCurrency(selectedLiquidacion.importeTotal)}</strong></div>
              {selectedLiquidacion.observacion && <div className="info-item"><span>Observación</span><strong>{selectedLiquidacion.observacion}</strong></div>}
            </div>
            <div className="section-subheader">
              <div>
                <h3>Retiros incluidos en la liquidación</h3>
                <p>{selectedLiquidacion.entregas.length} retiros asociados.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="users-table">
                <thead><tr><th>Fecha de retiro</th><th>Ordeñes</th><th>Litros entregados</th><th>Estado</th></tr></thead>
                <tbody>
                  {selectedLiquidacion.entregas.map((entrega) => (
                    <tr key={entrega.id}>
                      <td>{formatDate(entrega.fechaRetiro)}</td>
                      <td>{retiroCountLabel(entrega.ordenes.length)}</td>
                      <td><strong>{formatLiters(entregaLitros(entrega))}</strong></td>
                      <td><span className={`status-pill ${statusClass(entrega.estado)}`}>{estadoEntregaLabels[entrega.estado]}</span></td>
                    </tr>
                  ))}
                  {selectedLiquidacion.entregas.length === 0 && <tr><td colSpan={4}>No hay retiros asociados a esta liquidación.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {editingCliente && clienteEditForm && (
        <div className="modal-backdrop">
          <div className="modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Editar empresa</h2>
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
