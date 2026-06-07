import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RefreshCcw, RotateCcw, Trash2, X } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import { createLote, getLotes, updateLote } from '../../services/lotesService';
import type { Lote, LoteFormValues } from '../../types/lotes';

type EstadoFilter = '' | 'true' | 'false';

const emptyLoteForm: LoteFormValues = {
  nombre: '',
  descripcion: '',
  activo: true,
};

interface LotesPanelProps {
  authToken: string | null;
  onUnauthorized: () => void;
  onLotesChanged?: () => void | Promise<void>;
}

function textIncludes(value: string | null | undefined, query: string) {
  return (value ?? '').toLowerCase().includes(query);
}

function matchesEstado(value: boolean, filter: EstadoFilter) {
  return !filter || String(value) === filter;
}

function confirmLogicalDelete() {
  return window.confirm('¿Seguro que querés dar de baja este lote?');
}

function renderStatus(isActive: boolean) {
  return (
    <span className={`status-pill ${isActive ? 'status-active' : 'status-inactive'}`}>
      {isActive ? 'ACTIVO' : 'INACTIVO'}
    </span>
  );
}

export function LotesPanel({ authToken, onUnauthorized, onLotesChanged }: LotesPanelProps) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteFormValues, setLoteFormValues] = useState<LoteFormValues>(emptyLoteForm);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [loteFilters, setLoteFilters] = useState({
    buscar: '',
    estado: '' as EstadoFilter,
    minAnimales: '',
    maxAnimales: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  async function loadLotes() {
    if (!authToken) return;
    setIsLoading(true);
    clearMessages();

    try {
      setLotes(await getLotes(authToken));
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAfterChange() {
    await loadLotes();
    await onLotesChanged?.();
  }

  function resetLoteForm() {
    setEditingLote(null);
    setLoteFormValues(emptyLoteForm);
    setShowLoteModal(false);
  }

  function openNewLoteModal() {
    setEditingLote(null);
    setLoteFormValues(emptyLoteForm);
    setShowLoteModal(true);
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

      await refreshAfterChange();
    } catch (saveError) {
      handleRequestError(saveError);
    } finally {
      setIsSaving(false);
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
      await refreshAfterChange();
    } catch (updateError) {
      handleRequestError(updateError);
    }
  }

  useEffect(() => {
    void loadLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <section className="panel users-list-panel">
        <div className="panel-header">
          <div>
            <h2>Lotes</h2>
            <p>{visibleLotes.length} de {lotes.length} lotes registrados.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={openNewLoteModal}>
              <Plus size={16} /> Nuevo lote
            </button>
            <button type="button" className="icon-button" onClick={() => void loadLotes()} aria-label="Actualizar lotes">
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>

        <form className="filters-form events-filters production-filters">
          <label className="filter-field">
            <span>Buscar</span>
            <input
              value={loteFilters.buscar}
              onChange={(event) => setLoteFilters({ ...loteFilters, buscar: event.target.value })}
              placeholder="Nombre o descripción"
            />
          </label>
          <label className="filter-field">
            <span>Estado</span>
            <select
              value={loteFilters.estado}
              onChange={(event) => setLoteFilters({ ...loteFilters, estado: event.target.value as EstadoFilter })}
            >
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Animales mín.</span>
            <input
              type="number"
              min="0"
              value={loteFilters.minAnimales}
              onChange={(event) => setLoteFilters({ ...loteFilters, minAnimales: event.target.value })}
            />
          </label>
          <label className="filter-field">
            <span>Animales máx.</span>
            <input
              type="number"
              min="0"
              value={loteFilters.maxAnimales}
              onChange={(event) => setLoteFilters({ ...loteFilters, maxAnimales: event.target.value })}
            />
          </label>
        </form>

        {isLoading ? (
          <p className="table-empty">Cargando lotes...</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Animales</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleLotes.map((lote) => (
                  <tr key={lote.id}>
                    <td>
                      <strong>{lote.nombre}</strong>
                      <span>{lote.descripcion || 'Sin descripción'}</span>
                    </td>
                    <td>{lote.cantidadAnimales}</td>
                    <td>{renderStatus(lote.activo)}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => startEditingLote(lote)} aria-label={`Editar ${lote.nombre}`}>
                          <Edit2 size={16} />
                        </button>
                        {lote.activo ? (
                          <button type="button" onClick={() => void setLoteActive(lote, false)} aria-label={`Dar de baja ${lote.nombre}`}>
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button type="button" onClick={() => void setLoteActive(lote, true)} aria-label={`Reactivar ${lote.nombre}`}>
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showLoteModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>{editingLote ? 'Editar lote' : 'Nuevo lote'}</h2>
                <p>{editingLote ? 'Datos del lote y estado operativo.' : 'El lote se crea activo automáticamente.'}</p>
              </div>
              <button type="button" className="icon-button" onClick={resetLoteForm} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleLoteSubmit}>
              <label>
                <span>Nombre</span>
                <input
                  value={loteFormValues.nombre}
                  onChange={(event) => setLoteFormValues({ ...loteFormValues, nombre: event.target.value })}
                  required
                />
              </label>
              <label className="animal-form-message">
                <span>Descripción</span>
                <textarea
                  rows={3}
                  value={loteFormValues.descripcion}
                  onChange={(event) => setLoteFormValues({ ...loteFormValues, descripcion: event.target.value })}
                />
              </label>
              {editingLote && (
                <label>
                  <span>Estado</span>
                  <select
                    value={loteFormValues.activo ? 'true' : 'false'}
                    onChange={(event) => setLoteFormValues({ ...loteFormValues, activo: event.target.value === 'true' })}
                  >
                    <option value="true">ACTIVO</option>
                    <option value="false">INACTIVO</option>
                  </select>
                </label>
              )}
              <div className="modal-actions animal-form-actions">
                <button type="button" className="secondary-button" onClick={resetLoteForm}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  <Plus size={18} />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
