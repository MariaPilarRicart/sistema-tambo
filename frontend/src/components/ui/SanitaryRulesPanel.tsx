import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RefreshCcw, RotateCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import { useDataChangedRefresh } from '../../hooks/useDataChangedRefresh';
import {
  createReglaSanitaria,
  getReglasSanitarias,
  updateReglaSanitaria,
  type ReglaSanitaria,
  type ReglaSanitariaFormValues,
  type TipoReglaSanitaria,
} from '../../services/reglasSanitariasService';

type EstadoFilter = '' | 'true' | 'false';

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

interface SanitaryRulesPanelProps {
  authToken: string | null;
  onUnauthorized: () => void;
  onRulesChanged?: () => void | Promise<void>;
  isAdmin?: boolean;
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

function renderStatus(active: boolean, activeLabel = 'ACTIVA', inactiveLabel = 'INACTIVA') {
  return <span className={`status-pill ${active ? 'status-active' : 'status-inactive'}`}>{active ? activeLabel : inactiveLabel}</span>;
}

export function SanitaryRulesPanel({ authToken, onUnauthorized, onRulesChanged, isAdmin = true }: SanitaryRulesPanelProps) {
  const [reglas, setReglas] = useState<ReglaSanitaria[]>([]);
  const [reglaFormValues, setReglaFormValues] = useState<ReglaSanitariaFormValues>(emptyReglaForm);
  const [editingRegla, setEditingRegla] = useState<ReglaSanitaria | null>(null);
  const [showReglaModal, setShowReglaModal] = useState(false);
  const [reglaFilters, setReglaFilters] = useState({ buscar: '', estado: '' as EstadoFilter, tipo: '', frecuencia: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const visibleReglas = useMemo(() => {
    const query = reglaFilters.buscar.trim().toLowerCase();
    return reglas.filter((regla) => {
      const searchMatch = !query || textIncludes(regla.nombre, query) || textIncludes(regla.codigo, query);
      const frequencyMatch = !reglaFilters.frecuencia || String(regla.frecuenciaMeses) === reglaFilters.frecuencia;
      return searchMatch && matchesEstado(regla.activo, reglaFilters.estado) && (!reglaFilters.tipo || regla.tipo === reglaFilters.tipo) && frequencyMatch;
    });
  }, [reglas, reglaFilters]);

  const availableFrequencies = useMemo(
    () => [...new Set(reglas.map((regla) => regla.frecuenciaMeses))].sort((a, b) => a - b),
    [reglas],
  );

  function handleRequestError(requestError: unknown) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : 'No se pudo completar la operación.');
  }

  async function loadReglas() {
    if (!authToken) return;
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

  useEffect(() => {
    void loadReglas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useDataChangedRefresh(() => loadReglas(), [authToken]);

  function clearReglaFilters() {
    setReglaFilters({ buscar: '', estado: '', tipo: '', frecuencia: '' });
  }

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function resetReglaForm() {
    setEditingRegla(null);
    setReglaFormValues(emptyReglaForm);
    setShowReglaModal(false);
    clearMessages();
  }

  function openNewReglaModal() {
    setEditingRegla(null);
    setReglaFormValues({ ...emptyReglaForm, activo: true });
    setShowReglaModal(true);
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

  async function refreshAfterChange() {
    await loadReglas();
    await onRulesChanged?.();
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
      await refreshAfterChange();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
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
      await refreshAfterChange();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  return (
    <>
      <section className="panel users-list-panel">
        <div className="panel-header">
          <div><h2>Vacunas / Reglas Sanitarias</h2><p>{visibleReglas.length} de {reglas.length} reglas registradas.</p></div>
          <div className="header-actions">
            {isAdmin && <button type="button" className="secondary-button" onClick={openNewReglaModal}><Plus size={16} /> Nueva vacuna / regla sanitaria</button>}
            <button type="button" className="icon-button" onClick={() => void loadReglas()} aria-label="Actualizar reglas sanitarias"><RefreshCcw size={18} /></button>
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}
        <form className="filters-form events-filters production-filters">
          <label className="filter-field"><span>Buscar</span><input value={reglaFilters.buscar} onChange={(event) => setReglaFilters({ ...reglaFilters, buscar: event.target.value })} placeholder="Nombre o código" /></label>
          <label className="filter-field"><span>Estado</span><select value={reglaFilters.estado} onChange={(event) => setReglaFilters({ ...reglaFilters, estado: event.target.value as EstadoFilter })}><option value="">Todas</option><option value="true">Activa</option><option value="false">Inactiva</option></select></label>
          <label className="filter-field"><span>Tipo</span><select value={reglaFilters.tipo} onChange={(event) => setReglaFilters({ ...reglaFilters, tipo: event.target.value })}><option value="">Todos</option><option value="VACUNA">VACUNA</option><option value="ANALISIS">ANALISIS</option></select></label>
          <label className="filter-field"><span>Frecuencia</span><select value={reglaFilters.frecuencia} onChange={(event) => setReglaFilters({ ...reglaFilters, frecuencia: event.target.value })}><option value="">Todas</option>{availableFrequencies.map((frecuencia) => <option key={frecuencia} value={frecuencia}>{frecuencia} meses</option>)}</select></label>
          <button type="button" className="secondary-button" onClick={clearReglaFilters}>Limpiar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando reglas...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead><tr><th>Regla</th><th>Tipo</th><th>Frecuencia</th><th>Estado</th>{isAdmin && <th>Acciones</th>}</tr></thead>
              <tbody>{visibleReglas.map((regla) => <tr key={regla.id}><td><strong>{regla.nombre}</strong><span>{regla.codigo}</span></td><td>{regla.tipo}</td><td>{regla.mesFijo ? `Mes ${regla.mesFijo}` : `Cada ${regla.frecuenciaMeses} meses`} · anticipa {regla.anticipacionMeses}</td><td>{renderStatus(regla.activo)}</td>{isAdmin && <td><div className="table-actions"><button type="button" onClick={() => startEditingRegla(regla)} aria-label={`Editar ${regla.codigo}`}><Edit2 size={16} /></button>{regla.activo ? <button type="button" onClick={() => void setReglaActive(regla, false)} aria-label={`Dar de baja ${regla.codigo}`}><Trash2 size={16} /></button> : <button type="button" onClick={() => void setReglaActive(regla, true)} aria-label={`Reactivar ${regla.codigo}`}><RotateCcw size={16} /></button>}</div></td>}</tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

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
    </>
  );
}
