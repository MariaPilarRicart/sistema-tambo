import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import { createAlimento, getAlimentos, updateAlimento } from '../../services/alimentacionService';
import { useDataChangedRefresh } from '../../hooks/useDataChangedRefresh';
import type { Alimento, AlimentoFormValues, EstadoStockAlimentacion, TipoAlimento } from '../../types/alimentacion';

type EstadoFilter = '' | EstadoStockAlimentacion;

const tipoAlimentoOptions: TipoAlimento[] = ['SILO', 'BALANCEADO', 'FIBRA', 'SUPLEMENTO', 'SALES', 'OTRO'];

const emptyAlimentoForm: AlimentoFormValues = {
  nombre: '',
  tipoAlimento: 'SILO',
  unidad: 'KG',
  stockActual: '0',
  puntoStockMinimo: '0',
  activo: true,
  observaciones: '',
};

interface AlimentosStockPanelProps {
  authToken: string | null;
  onUnauthorized: () => void;
  onChanged?: () => void | Promise<void>;
  isAdmin?: boolean;
  initialStockFilter?: EstadoFilter;
}

function textIncludes(value: string | null | undefined, query: string) {
  return (value ?? '').toLowerCase().includes(query);
}

function getStockEstado(alimento: Alimento): EstadoStockAlimentacion {
  if (!alimento.activo) return 'INACTIVO';
  if (alimento.stockActual <= 0) return 'AGOTADO';
  if (alimento.stockActual <= alimento.stockMinimo) return 'BAJO';
  return 'NORMAL';
}

function matchesEstado(alimento: Alimento, filter: EstadoFilter) {
  return !filter || getStockEstado(alimento) === filter;
}

function statusClass(estado: EstadoStockAlimentacion) {
  if (estado === 'NORMAL') return 'status-active';
  if (estado === 'BAJO') return 'status-warning';
  if (estado === 'AGOTADO') return 'status-danger';
  return 'status-inactive';
}

function renderStatus(alimento: Alimento) {
  const estado = getStockEstado(alimento);
  return <span className={`status-pill ${statusClass(estado)}`}>{estado}</span>;
}

export function AlimentosStockPanel({ authToken, onUnauthorized, onChanged, isAdmin = true, initialStockFilter = '' }: AlimentosStockPanelProps) {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [formValues, setFormValues] = useState<AlimentoFormValues>(emptyAlimentoForm);
  const [editingAlimento, setEditingAlimento] = useState<Alimento | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ buscar: '', estado: initialStockFilter, tipoAlimento: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const availableTypes = useMemo(
    () => tipoAlimentoOptions.filter((tipo) => alimentos.some((alimento) => alimento.tipoAlimento === tipo)),
    [alimentos],
  );

  const visibleAlimentos = useMemo(() => {
    const query = filters.buscar.trim().toLowerCase();
    return alimentos
      .filter((alimento) => {
        const searchMatch = !query || textIncludes(alimento.nombre, query);
        return searchMatch
          && matchesEstado(alimento, filters.estado)
          && (!filters.tipoAlimento || alimento.tipoAlimento === filters.tipoAlimento);
      })
      .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es'));
  }, [alimentos, filters]);

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

  async function loadAlimentos() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');
    try {
      setAlimentos(await getAlimentos(authToken));
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAfterChange() {
    await loadAlimentos();
    await onChanged?.();
  }

  function resetForm() {
    setEditingAlimento(null);
    setFormValues(emptyAlimentoForm);
    setShowModal(false);
    clearMessages();
  }

  function openNewModal() {
    setEditingAlimento(null);
    setFormValues({ ...emptyAlimentoForm, activo: true });
    setShowModal(true);
    clearMessages();
  }

  function startEditing(alimento: Alimento) {
    setEditingAlimento(alimento);
    setFormValues({
      nombre: alimento.nombre,
      tipoAlimento: alimento.tipoAlimento,
      unidad: alimento.unidadMedida,
      stockActual: String(alimento.stockActual),
      puntoStockMinimo: String(alimento.stockMinimo),
      activo: alimento.activo,
      observaciones: alimento.descripcion ?? '',
    });
    setShowModal(true);
    clearMessages();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    clearMessages();
    try {
      if (editingAlimento) {
        await updateAlimento(authToken, editingAlimento.id, {
          ...formValues,
          stockActual: String(editingAlimento.stockActual),
        });
        resetForm();
        setSuccess('Alimento actualizado correctamente.');
      } else {
        await createAlimento(authToken, { ...formValues, activo: true });
        resetForm();
        setSuccess('Alimento creado correctamente.');
      }
      await refreshAfterChange();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function setAlimentoActive(alimento: Alimento, activo: boolean) {
    if (!authToken) return onUnauthorized();
    if (!activo && !window.confirm('¿Deseás dar de baja este alimento?')) return;
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
      await refreshAfterChange();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  useEffect(() => {
    void loadAlimentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    setFilters((current) => ({ ...current, estado: initialStockFilter }));
  }, [initialStockFilter]);

  useDataChangedRefresh(() => loadAlimentos(), [authToken]);

  function clearFilters() {
    setFilters({ buscar: '', estado: '', tipoAlimento: '' });
  }

  return (
    <>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <section className="panel users-list-panel" id="stock-alimentos-section">
        <div className="panel-header">
          <div><h2>Stock de alimentos</h2><p>{visibleAlimentos.length} de {alimentos.length} alimentos cargados.</p></div>
          <div className="header-actions">
            {isAdmin && <button type="button" className="secondary-button" onClick={openNewModal}><Plus size={16} /> Nuevo alimento</button>}
            <button type="button" className="icon-button" onClick={() => void loadAlimentos()} aria-label="Actualizar alimentos"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field"><span>Buscar</span><input value={filters.buscar} onChange={(event) => setFilters({ ...filters, buscar: event.target.value })} placeholder="Nombre" /></label>
          <label className="filter-field"><span>Estado</span><select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value as EstadoFilter })}><option value="">Todos</option><option value="NORMAL">Normal</option><option value="BAJO">Bajo</option><option value="AGOTADO">Agotado</option><option value="INACTIVO">Inactivo</option></select></label>
          <label className="filter-field"><span>Tipo</span><select value={filters.tipoAlimento} onChange={(event) => setFilters({ ...filters, tipoAlimento: event.target.value })}><option value="">Todos</option>{availableTypes.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></label>
          <button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando alimentos...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead><tr><th>Alimento</th><th>Tipo</th><th>Unidad</th><th>Stock actual</th><th>Punto mínimo</th><th>Estado</th>{isAdmin && <th>Acciones</th>}</tr></thead>
              <tbody>
                {visibleAlimentos.map((alimento) => (
                  <tr key={alimento.id} className={!alimento.activo ? 'stock-inactive-row' : undefined}>
                    <td><strong>{alimento.nombre}</strong><span>{alimento.descripcion || '-'}</span></td>
                    <td>{alimento.tipoAlimento}</td>
                    <td>{alimento.unidadMedida}</td>
                    <td>{alimento.stockActual}</td>
                    <td>{alimento.stockMinimo}</td>
                    <td>{renderStatus(alimento)}</td>
                    {isAdmin && <td><div className="table-actions"><button type="button" onClick={() => startEditing(alimento)} aria-label={`Editar ${alimento.nombre}`}><Edit2 size={16} /></button>{alimento.activo && <button type="button" onClick={() => void setAlimentoActive(alimento, false)} aria-label={`Dar de baja ${alimento.nombre}`}><Trash2 size={16} /></button>}</div></td>}
                  </tr>
                ))}
                {visibleAlimentos.length === 0 && <tr><td colSpan={isAdmin ? 7 : 6}>Sin alimentos para mostrar.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div><h2>{editingAlimento ? 'Editar alimento' : 'Nuevo alimento'}</h2><p>{editingAlimento ? 'El stock se modifica desde movimientos o registros de alimentación.' : 'El alimento se crea activo automáticamente.'}</p></div>
              <button type="button" className="icon-button" onClick={resetForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleSubmit}>
              <label><span>Nombre</span><input value={formValues.nombre} onChange={(event) => setFormValues({ ...formValues, nombre: event.target.value })} required /></label>
              <label><span>Tipo de alimento</span><select value={formValues.tipoAlimento} onChange={(event) => setFormValues({ ...formValues, tipoAlimento: event.target.value as AlimentoFormValues['tipoAlimento'] })}>{tipoAlimentoOptions.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></label>
              <label><span>Unidad</span><select value={formValues.unidad} onChange={(event) => setFormValues({ ...formValues, unidad: event.target.value as AlimentoFormValues['unidad'] })}><option value="KG">KG</option><option value="ROLLO">ROLLO</option><option value="UNIDAD">UNIDAD</option></select></label>
              <label><span>Stock actual</span><input type="number" min="0" step="0.01" value={formValues.stockActual} onChange={(event) => setFormValues({ ...formValues, stockActual: event.target.value })} required disabled={Boolean(editingAlimento)} /></label>
              <label><span>Punto stock mínimo</span><input type="number" min="0" step="0.01" value={formValues.puntoStockMinimo} onChange={(event) => setFormValues({ ...formValues, puntoStockMinimo: event.target.value })} required /></label>
              {editingAlimento && <label><span>Estado</span><select value={formValues.activo ? 'true' : 'false'} onChange={(event) => setFormValues({ ...formValues, activo: event.target.value === 'true' })}><option value="true">ACTIVO</option><option value="false">INACTIVO</option></select></label>}
              <label className="animal-form-message"><span>Observaciones</span><textarea rows={3} value={formValues.observaciones} onChange={(event) => setFormValues({ ...formValues, observaciones: event.target.value })} /></label>
              <div className="modal-actions animal-form-actions"><button type="button" className="secondary-button" onClick={resetForm}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
