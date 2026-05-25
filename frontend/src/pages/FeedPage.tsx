import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RefreshCcw, Trash2, Wheat, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import {
  createRacion,
  createRegistroAlimentacion,
  deactivateRacion,
  getRaciones,
  getRegistrosAlimentacion,
  getResumenAlimentacion,
  updateRacion,
} from '../services/alimentacionService';
import { getLotes } from '../services/lotesService';
import type {
  AlimentacionResumen,
  Racion,
  RacionFormValues,
  RegistroAlimentacion,
  RegistroAlimentacionFormValues,
} from '../types/alimentacion';
import type { AuthUser } from '../types/auth';
import type { Lote } from '../types/lotes';

const emptyRacionForm: RacionFormValues = {
  nombre: '',
  descripcion: '',
  activa: true,
};

const emptyRegistroForm: RegistroAlimentacionFormValues = {
  fecha: new Date().toISOString().slice(0, 10),
  loteId: '',
  racionId: '',
  cantidadKg: '',
  observaciones: '',
};

interface FeedPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatKg(value: number) {
  return `${Number(value).toLocaleString()} kg`;
}

export function FeedPage({ authToken, currentUser, onUnauthorized }: FeedPageProps) {
  const [raciones, setRaciones] = useState<Racion[]>([]);
  const [registros, setRegistros] = useState<RegistroAlimentacion[]>([]);
  const [resumen, setResumen] = useState<AlimentacionResumen | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [racionForm, setRacionForm] = useState<RacionFormValues>(emptyRacionForm);
  const [registroForm, setRegistroForm] = useState<RegistroAlimentacionFormValues>(emptyRegistroForm);
  const [editingRacion, setEditingRacion] = useState<Racion | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const activeRaciones = useMemo(() => raciones.filter((racion) => racion.activa), [raciones]);
  const activeLotes = useMemo(() => lotes.filter((lote) => lote.activo), [lotes]);
  const maxKgByLote = useMemo(
    () => Math.max(...(resumen?.alimentacionPorLote.map((item) => item.totalKg) ?? [1]), 1),
    [resumen],
  );

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
      const [nextRaciones, nextRegistros, nextResumen, nextLotes] = await Promise.all([
        getRaciones(authToken),
        getRegistrosAlimentacion(authToken),
        getResumenAlimentacion(authToken),
        getLotes(authToken),
      ]);
      setRaciones(nextRaciones);
      setRegistros(nextRegistros);
      setResumen(nextResumen);
      setLotes(nextLotes);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar alimentacion.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  function resetRacionForm() {
    setEditingRacion(null);
    setRacionForm(emptyRacionForm);
  }

  function startEditingRacion(racion: Racion) {
    setEditingRacion(racion);
    setRacionForm({
      nombre: racion.nombre,
      descripcion: racion.descripcion ?? '',
      activa: racion.activa,
    });
    setError('');
    setSuccess('');
  }

  async function handleRacionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingRacion) {
        await updateRacion(authToken, editingRacion.id, racionForm);
        setSuccess('Racion actualizada correctamente.');
      } else {
        await createRacion(authToken, racionForm);
        setSuccess('Racion creada correctamente.');
      }
      resetRacionForm();
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo guardar la racion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateRacion(racion: Racion) {
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await deactivateRacion(authToken, racion.id);
      setSuccess('Racion dada de baja correctamente.');
      await loadData();
    } catch (deleteError) {
      handleRequestError(deleteError, 'No se pudo dar de baja la racion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegistroSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await createRegistroAlimentacion(authToken, registroForm);
      setRegistroForm(emptyRegistroForm);
      setSuccess('Alimentacion registrada correctamente.');
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar la alimentacion.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Alimentacion</h2>
          <p>Raciones, entregas por lote e historial operativo.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar alimentacion">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="operative-summary-grid">
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-emerald"><Wheat size={20} /></div>
          <p className="metric-title">Kg entregados</p>
          <strong className="metric-value">{formatKg(resumen?.totalKgEntregados ?? 0)}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-blue"><Wheat size={20} /></div>
          <p className="metric-title">Registros de hoy</p>
          <strong className="metric-value">{resumen?.registrosHoy ?? 0}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-indigo"><Wheat size={20} /></div>
          <p className="metric-title">Raciones activas</p>
          <strong className="metric-value">{resumen?.racionesActivas ?? 0}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-amber"><Wheat size={20} /></div>
          <p className="metric-title">Lotes alimentados</p>
          <strong className="metric-value">{resumen?.lotesAlimentados ?? 0}</strong>
        </article>
      </div>

      <div className="feed-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Raciones</h2>
              <p>{isAdmin ? 'Alta, edicion y baja logica.' : 'Consulta de raciones.'}</p>
            </div>
            {editingRacion && (
              <button type="button" className="icon-button" onClick={resetRacionForm} aria-label="Cancelar edicion">
                <X size={18} />
              </button>
            )}
          </div>

          {isAdmin && (
            <form className="user-form" onSubmit={handleRacionSubmit}>
              <label>
                <span>Nombre</span>
                <input
                  value={racionForm.nombre}
                  onChange={(event) => setRacionForm({ ...racionForm, nombre: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>Descripcion</span>
                <input
                  value={racionForm.descripcion}
                  onChange={(event) => setRacionForm({ ...racionForm, descripcion: event.target.value })}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={racionForm.activa}
                  onChange={(event) => setRacionForm({ ...racionForm, activa: event.target.checked })}
                />
                <span>Racion activa</span>
              </label>
              <button type="submit" className="primary-button" disabled={isSaving}>
                <Plus size={18} />
                {isSaving ? 'Guardando...' : editingRacion ? 'Guardar racion' : 'Crear racion'}
              </button>
            </form>
          )}

          <div className="table-wrap feed-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {raciones.map((racion) => (
                  <tr key={racion.id}>
                    <td><strong>{racion.nombre}</strong><span>{racion.descripcion || 'Sin descripcion'}</span></td>
                    <td><span className={`status-pill ${racion.activa ? 'status-active' : 'status-inactive'}`}>{racion.activa ? 'ACTIVA' : 'INACTIVA'}</span></td>
                    <td>
                      {isAdmin && (
                        <div className="table-actions">
                          <button type="button" onClick={() => startEditingRacion(racion)} aria-label={`Editar ${racion.nombre}`}><Edit2 size={16} /></button>
                          <button type="button" onClick={() => void handleDeactivateRacion(racion)} disabled={!racion.activa} aria-label={`Dar de baja ${racion.nombre}`}><Trash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {raciones.length === 0 && <tr><td colSpan={3}>Sin raciones cargadas.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Registrar alimentacion</h2>
              <p>Entrega de alimento por lote.</p>
            </div>
          </div>
          <form className="user-form" onSubmit={handleRegistroSubmit}>
            <label>
              <span>Fecha</span>
              <input type="date" value={registroForm.fecha} onChange={(event) => setRegistroForm({ ...registroForm, fecha: event.target.value })} required />
            </label>
            <label>
              <span>Lote</span>
              <select value={registroForm.loteId} onChange={(event) => setRegistroForm({ ...registroForm, loteId: event.target.value })} required>
                <option value="">Seleccionar lote</option>
                {activeLotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
              </select>
            </label>
            <label>
              <span>Racion</span>
              <select value={registroForm.racionId} onChange={(event) => setRegistroForm({ ...registroForm, racionId: event.target.value })} required>
                <option value="">Seleccionar racion</option>
                {activeRaciones.map((racion) => <option key={racion.id} value={racion.id}>{racion.nombre}</option>)}
              </select>
            </label>
            <label>
              <span>Cantidad kg</span>
              <input type="number" min="0.01" step="0.01" value={registroForm.cantidadKg} onChange={(event) => setRegistroForm({ ...registroForm, cantidadKg: event.target.value })} required />
            </label>
            <label>
              <span>Observaciones</span>
              <textarea value={registroForm.observaciones} onChange={(event) => setRegistroForm({ ...registroForm, observaciones: event.target.value })} rows={4} />
            </label>
            <button type="submit" className="primary-button" disabled={isSaving || activeRaciones.length === 0}>
              <Wheat size={18} />
              {isSaving ? 'Registrando...' : 'Registrar alimentacion'}
            </button>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Resumen por lote</h2>
            <p>Kg entregados acumulados.</p>
          </div>
        </div>
        <div className="compact-bars">
          {(resumen?.alimentacionPorLote ?? []).map((item) => (
            <div className="compact-bar-row" key={item.loteId}>
              <div className="compact-bar-label">
                <strong>{item.nombre}</strong>
                <span>{formatKg(item.totalKg)}</span>
              </div>
              <div className="compact-bar-track" aria-hidden="true">
                <span style={{ width: `${(item.totalKg / Math.max(maxKgByLote, 1)) * 100}%` }} />
              </div>
            </div>
          ))}
          {(!resumen || resumen.alimentacionPorLote.length === 0) && <p className="table-empty">Sin datos para mostrar.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historial de alimentacion</h2>
            <p>{registros.length} registros cargados.</p>
          </div>
        </div>
        {isLoading ? <p className="table-empty">Cargando alimentacion...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Lote</th>
                  <th>Racion</th>
                  <th>Kg</th>
                  <th>Usuario</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td>{formatDate(registro.fecha)}</td>
                    <td>{registro.lote.nombre}</td>
                    <td>{registro.racion.nombre}</td>
                    <td>{formatKg(registro.cantidadKg)}</td>
                    <td>{registro.usuario?.nombre ?? '-'}</td>
                    <td>{registro.observaciones || '-'}</td>
                  </tr>
                ))}
                {registros.length === 0 && <tr><td colSpan={6}>Sin registros de alimentacion.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
