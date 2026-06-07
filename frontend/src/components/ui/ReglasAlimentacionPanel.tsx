import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RefreshCcw, RotateCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import { createReglaAlimentacion, getAlimentos, getReglasAlimentacion, updateReglaAlimentacion } from '../../services/alimentacionService';
import type {
  Alimento,
  DetalleReglaAlimentacionFormValues,
  ReglaAlimentacion,
  ReglaAlimentacionFormValues,
} from '../../types/alimentacion';
import type { CategoriaAnimal } from '../../types/animales';

type EstadoFilter = '' | 'true' | 'false';

const categoriaOptions: CategoriaAnimal[] = [
  'GUACHERA',
  'ESCUELITA',
  'TERNERA',
  'VAQUILLONA',
  'VACA_PRODUCCION',
  'VACA_SECA',
  'PREPARTO',
];

const emptyReglaForm: ReglaAlimentacionFormValues = {
  nombre: '',
  categoriaAnimal: '',
  activo: true,
  observaciones: '',
  detalles: [],
};

const emptyDetalleForm: DetalleReglaAlimentacionFormValues = {
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

interface ReglasAlimentacionPanelProps {
  authToken: string | null;
  onUnauthorized: () => void;
  onChanged?: () => void | Promise<void>;
}

function textIncludes(value: string | null | undefined, query: string) {
  return (value ?? '').toLowerCase().includes(query);
}

function matchesEstado(value: boolean, filter: EstadoFilter) {
  return !filter || String(value) === filter;
}

function renderStatus(active: boolean) {
  return <span className={`status-pill ${active ? 'status-active' : 'status-inactive'}`}>{active ? 'ACTIVA' : 'INACTIVA'}</span>;
}

export function ReglasAlimentacionPanel({ authToken, onUnauthorized, onChanged }: ReglasAlimentacionPanelProps) {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [reglas, setReglas] = useState<ReglaAlimentacion[]>([]);
  const [formValues, setFormValues] = useState<ReglaAlimentacionFormValues>(emptyReglaForm);
  const [editingRegla, setEditingRegla] = useState<ReglaAlimentacion | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ buscar: '', estado: '' as EstadoFilter, categoriaAnimal: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const availableCategorias = useMemo(
    () => categoriaOptions.filter((categoria) => reglas.some((regla) => regla.categoriaAnimal === categoria)),
    [reglas],
  );

  const visibleReglas = useMemo(() => {
    const query = filters.buscar.trim().toLowerCase();
    return reglas.filter((regla) => {
      const searchMatch = !query || textIncludes(regla.nombre, query);
      return searchMatch && matchesEstado(regla.activo, filters.estado) && (!filters.categoriaAnimal || regla.categoriaAnimal === filters.categoriaAnimal);
    });
  }, [reglas, filters]);

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

  async function loadData() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');
    try {
      const [nextAlimentos, nextReglas] = await Promise.all([
        getAlimentos(authToken),
        getReglasAlimentacion(authToken),
      ]);
      setAlimentos(nextAlimentos);
      setReglas(nextReglas);
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAfterChange() {
    await loadData();
    await onChanged?.();
  }

  function resetForm() {
    setEditingRegla(null);
    setFormValues(emptyReglaForm);
    setShowModal(false);
    clearMessages();
  }

  function openNewModal() {
    setEditingRegla(null);
    setFormValues({ ...emptyReglaForm, activo: true, detalles: [{ ...emptyDetalleForm }] });
    setShowModal(true);
    clearMessages();
  }

  function startEditing(regla: ReglaAlimentacion) {
    setEditingRegla(regla);
    setFormValues({
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
    setShowModal(true);
    clearMessages();
  }

  function updateDetalle(index: number, changes: Partial<DetalleReglaAlimentacionFormValues>) {
    setFormValues((current) => ({
      ...current,
      detalles: current.detalles.map((detalle, detalleIndex) =>
        detalleIndex === index ? { ...detalle, ...changes } : detalle,
      ),
    }));
  }

  function addDetalle() {
    setFormValues((current) => ({ ...current, detalles: [...current.detalles, { ...emptyDetalleForm }] }));
  }

  function removeDetalle(index: number) {
    setFormValues((current) => ({ ...current, detalles: current.detalles.filter((_detalle, detalleIndex) => detalleIndex !== index) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    clearMessages();
    try {
      if (editingRegla) {
        await updateReglaAlimentacion(authToken, editingRegla.id, formValues);
        resetForm();
        setSuccess('Regla de alimentación actualizada correctamente.');
      } else {
        await createReglaAlimentacion(authToken, { ...formValues, activo: true });
        resetForm();
        setSuccess('Regla de alimentación creada correctamente.');
      }
      await refreshAfterChange();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function setReglaActive(regla: ReglaAlimentacion, activo: boolean) {
    if (!authToken) return onUnauthorized();
    if (!activo && !window.confirm('¿Seguro que querés dar de baja este registro?')) return;
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
      await refreshAfterChange();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <section className="panel users-list-panel">
        <div className="panel-header">
          <div><h2>Reglas de alimentación</h2><p>{visibleReglas.length} de {reglas.length} reglas configuradas.</p></div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={openNewModal}><Plus size={16} /> Nueva regla</button>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar reglas de alimentación"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field"><span>Buscar</span><input value={filters.buscar} onChange={(event) => setFilters({ ...filters, buscar: event.target.value })} placeholder="Nombre de regla" /></label>
          <label className="filter-field"><span>Estado</span><select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value as EstadoFilter })}><option value="">Todas</option><option value="true">Activa</option><option value="false">Inactiva</option></select></label>
          <label className="filter-field"><span>Categoría</span><select value={filters.categoriaAnimal} onChange={(event) => setFilters({ ...filters, categoriaAnimal: event.target.value })}><option value="">Todas</option>{availableCategorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}</select></label>
        </form>
        {isLoading ? <p className="table-empty">Cargando reglas...</p> : (
          <div className="table-wrap settings-secondary-table">
            <table className="users-table">
              <thead><tr><th>Regla</th><th>Categoría</th><th>Alimentos incluidos</th><th>Resumen</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {visibleReglas.map((regla) => (
                  <tr key={regla.id}>
                    <td><strong>{regla.nombre}</strong><span>{regla.observaciones || '-'}</span></td>
                    <td>{regla.categoriaAnimal}</td>
                    <td>{regla.detalles.length}</td>
                    <td>{regla.detalles.map((detalle) => detalle.alimento.nombre).join(', ') || '-'}</td>
                    <td>{renderStatus(regla.activo)}</td>
                    <td><div className="table-actions"><button type="button" onClick={() => startEditing(regla)} aria-label={`Editar ${regla.nombre}`}><Edit2 size={16} /></button>{regla.activo ? <button type="button" onClick={() => void setReglaActive(regla, false)} aria-label={`Dar de baja ${regla.nombre}`}><Trash2 size={16} /></button> : <button type="button" onClick={() => void setReglaActive(regla, true)} aria-label={`Reactivar ${regla.nombre}`}><RotateCcw size={16} /></button>}</div></td>
                  </tr>
                ))}
                {visibleReglas.length === 0 && <tr><td colSpan={6}>Sin reglas para mostrar.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel modal-panel-wide animal-form-modal">
            <div className="panel-header">
              <div><h2>{editingRegla ? 'Editar regla' : 'Nueva regla'}</h2><p>Dieta completa por categoría con varios alimentos.</p></div>
              <button type="button" className="icon-button" onClick={resetForm} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="user-form" onSubmit={handleSubmit}>
              <div className="feed-registration-form">
                <label><span>Nombre de la regla</span><input value={formValues.nombre} onChange={(event) => setFormValues({ ...formValues, nombre: event.target.value })} required /></label>
                <label><span>Categoría</span><select value={formValues.categoriaAnimal} onChange={(event) => setFormValues({ ...formValues, categoriaAnimal: event.target.value as ReglaAlimentacionFormValues['categoriaAnimal'] })} required><option value="">Seleccionar</option>{categoriaOptions.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}</select></label>
                {editingRegla && <label><span>Estado</span><select value={formValues.activo ? 'true' : 'false'} onChange={(event) => setFormValues({ ...formValues, activo: event.target.value === 'true' })}><option value="true">ACTIVA</option><option value="false">INACTIVA</option></select></label>}
                <label className="form-wide"><span>Observaciones</span><textarea rows={2} value={formValues.observaciones} onChange={(event) => setFormValues({ ...formValues, observaciones: event.target.value })} /></label>
              </div>
              <div className="panel-header panel-header-spaced">
                <div><h2>Alimentos de la regla</h2><p>{formValues.detalles.length} alimentos asociados.</p></div>
                <button type="button" className="secondary-button" onClick={addDetalle}><Plus size={16} /> Agregar alimento a la regla</button>
              </div>
              <div className="table-wrap">
                <table className="users-table">
                  <thead><tr><th>Alimento</th><th>Tipo cálculo</th><th>Unidad</th><th>Min</th><th>Max</th><th>Animales base</th><th>Rollos base</th><th>Días</th><th>Oblig.</th><th>Observaciones</th><th></th></tr></thead>
                  <tbody>{formValues.detalles.map((detalle, index) => <tr key={`${index}-${detalle.alimentoId}`}><td><select className="table-input" value={detalle.alimentoId} onChange={(event) => updateDetalle(index, { alimentoId: event.target.value })}><option value="">Seleccionar</option>{alimentos.filter((alimento) => alimento.activo || alimento.id === Number(detalle.alimentoId)).map((alimento) => <option key={alimento.id} value={alimento.id}>{alimento.nombre}</option>)}</select></td><td><select className="table-input" value={detalle.tipoCalculo} onChange={(event) => updateDetalle(index, { tipoCalculo: event.target.value as DetalleReglaAlimentacionFormValues['tipoCalculo'] })}><option value="KG_POR_ANIMAL_DIA">KG/animal/día</option><option value="ROLLOS_POR_GRUPO_DURACION">Rollos/grupo</option><option value="OBLIGATORIO_SIN_CANTIDAD">Obligatorio</option></select></td><td><select className="table-input" value={detalle.unidad} onChange={(event) => updateDetalle(index, { unidad: event.target.value as DetalleReglaAlimentacionFormValues['unidad'] })}><option value="KG">KG</option><option value="ROLLO">ROLLO</option><option value="UNIDAD">UNIDAD</option></select></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.cantidadMinima} onChange={(event) => updateDetalle(index, { cantidadMinima: event.target.value })} /></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.cantidadMaxima} onChange={(event) => updateDetalle(index, { cantidadMaxima: event.target.value })} /></td><td><input className="table-input" type="number" min="1" value={detalle.animalesBase} onChange={(event) => updateDetalle(index, { animalesBase: event.target.value })} /></td><td><input className="table-input" type="number" min="0" step="0.01" value={detalle.rollosBase} onChange={(event) => updateDetalle(index, { rollosBase: event.target.value })} /></td><td><input className="table-input" type="number" min="1" value={detalle.duracionDias} onChange={(event) => updateDetalle(index, { duracionDias: event.target.value })} /></td><td><input type="checkbox" checked={detalle.obligatorio} onChange={(event) => updateDetalle(index, { obligatorio: event.target.checked })} /></td><td><input className="table-input" value={detalle.observaciones} onChange={(event) => updateDetalle(index, { observaciones: event.target.value })} /></td><td><button type="button" className="icon-button" onClick={() => removeDetalle(index)} aria-label="Quitar alimento"><Trash2 size={16} /></button></td></tr>)}</tbody>
                </table>
              </div>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={resetForm}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving}><Plus size={18} />{isSaving ? 'Guardando...' : 'Guardar regla'}</button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
