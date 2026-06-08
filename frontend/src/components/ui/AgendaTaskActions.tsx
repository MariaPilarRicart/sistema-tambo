import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Eye, Trash2, X } from 'lucide-react';
import { cancelAgendaTask } from '../../services/agendaService';
import { ApiError } from '../../services/apiClient';
import { createEvento } from '../../services/eventosService';
import type { AgendaTarea, TipoTarea } from '../../types/agenda';
import type { AuthUser } from '../../types/auth';
import type { EventoFormValues, TipoEvento } from '../../types/eventos';

const suggestedEventByTask: Record<TipoTarea, TipoEvento> = {
  TACTO: 'TACTO',
  SECADO: 'SECADO',
  PARTO: 'PARTO',
  ALTA_POST_PARTO: 'CLINICO',
  VACUNACION: 'VACUNACION',
  CONTROL_CLINICO: 'CLINICO',
};

function buildEventForm(task: AgendaTarea): EventoFormValues {
  return {
    tipo: suggestedEventByTask[task.tipo],
    fecha: new Date().toISOString().slice(0, 10),
    observaciones: task.descripcion ?? '',
    resultadoTacto: 'POSITIVO',
  };
}

function getEventConfirmationDetails(values: EventoFormValues) {
  if (values.tipo === 'TACTO' && values.resultadoTacto === 'POSITIVO') {
    return ['El animal pasara a estado PRENADA.', 'Se cerrara TACTO.', 'Se crearan SECADO y PARTO.'];
  }
  if (values.tipo === 'TACTO') return ['Se cerrara TACTO.', 'El animal pasara a estado VACIA.'];
  if (values.tipo === 'SECADO') return ['El animal pasara a estado SECA.'];
  if (values.tipo === 'PARTO') return ['El animal pasara a estado RECUPERACION.', 'Se creara ALTA_POST_PARTO.'];
  if (values.tipo === 'VACUNACION') return ['Se registrara la vacunacion en el historial.'];
  return ['Se registrara el evento en el historial del animal.'];
}

interface AgendaTaskActionsProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  task: AgendaTarea;
  onChanged: () => void;
  onUnauthorized: () => void;
  showEventAction?: boolean;
  fichaLinkState?: {
    from: string;
    label: string;
  };
}

export function AgendaTaskActions({
  authToken,
  currentUser,
  task,
  onChanged,
  onUnauthorized,
  showEventAction = true,
  fichaLinkState,
}: AgendaTaskActionsProps) {
  const [eventFormValues, setEventFormValues] = useState<EventoFormValues>(() => buildEventForm(task));
  const [cancelObservation, setCancelObservation] = useState('');
  const [mode, setMode] = useState<'event' | 'event-confirm' | 'cancel' | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const canAct = task.estadoCalculado === 'PENDIENTE';

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }

    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  function openEventModal() {
    setEventFormValues(buildEventForm(task));
    setError('');
    setMode('event');
  }

  function closeModal() {
    setMode(null);
    setCancelObservation('');
    setError('');
    setIsSaving(false);
  }

  function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMode('event-confirm');
  }

  async function confirmEventRegistration() {
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');

    try {
      await createEvento(authToken, task.animal.id, eventFormValues);
      closeModal();
      onChanged();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar el evento.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');

    try {
      await cancelAgendaTask(authToken, task.id, { observacion: cancelObservation });
      closeModal();
      onChanged();
    } catch (cancelError) {
      handleRequestError(cancelError, 'No se pudo cancelar la tarea.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="table-actions">
        <Link
          className="task-action-button"
          to={`/rodeos/${task.animal.id}`}
          state={fichaLinkState}
          aria-label={`Ver ficha ${task.animal.caravana}`}
        >
          <Eye size={16} />
        </Link>
        {canAct && showEventAction && (
          <button type="button" onClick={openEventModal} aria-label={`Registrar evento ${task.tipo}`}>
            <CalendarPlus size={16} />
          </button>
        )}
        {canAct && isAdmin && (
          <button type="button" onClick={() => setMode('cancel')} aria-label={`Cancelar tarea ${task.tipo}`}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {(mode === 'event' || mode === 'event-confirm') && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <div className="panel-header">
              <div>
                <h2>Registrar evento asociado</h2>
                <p>#{task.animal.caravana} · tarea {task.tipo}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeModal} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>

            {mode === 'event-confirm' ? (
              <div className="user-form">
                <div className="form-warning">
                  Este evento puede modificar el estado del animal y cerrar o generar tareas automaticas.
                </div>
                <ul className="confirmation-list">
                  {getEventConfirmationDetails(eventFormValues).map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={() => setMode('event')} disabled={isSaving}>
                    Volver
                  </button>
                  <button type="button" className="primary-button" onClick={() => void confirmEventRegistration()} disabled={isSaving}>
                    <CalendarPlus size={18} />
                    {isSaving ? 'Registrando...' : 'Confirmar evento'}
                  </button>
                </div>
              </div>
            ) : (
              <form className="user-form" onSubmit={handleEventSubmit}>
                <label>
                  <span>Tipo de evento</span>
                  <select
                    value={eventFormValues.tipo}
                    onChange={(event) => setEventFormValues({ ...eventFormValues, tipo: event.target.value as TipoEvento })}
                  >
                    <option value="TACTO">TACTO</option>
                    <option value="SECADO">SECADO</option>
                    <option value="PARTO">PARTO</option>
                    <option value="CLINICO">CLINICO</option>
                    <option value="VACUNACION">VACUNACION</option>
                  </select>
                </label>
                {eventFormValues.tipo === 'TACTO' && (
                  <label>
                    <span>Resultado</span>
                    <select
                      value={eventFormValues.resultadoTacto}
                      onChange={(event) => setEventFormValues({
                        ...eventFormValues,
                        resultadoTacto: event.target.value as 'POSITIVO' | 'NEGATIVO',
                      })}
                    >
                      <option value="POSITIVO">POSITIVO</option>
                      <option value="NEGATIVO">NEGATIVO</option>
                    </select>
                  </label>
                )}
                <label>
                  <span>Observaciones</span>
                  <textarea
                    value={eventFormValues.observaciones}
                    onChange={(event) => setEventFormValues({ ...eventFormValues, observaciones: event.target.value })}
                    rows={4}
                  />
                </label>
                {error && <div className="form-error">{error}</div>}
                <button type="submit" className="primary-button" disabled={isSaving}>
                  <CalendarPlus size={18} />
                  Continuar
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {mode === 'cancel' && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <div className="panel-header">
              <div>
                <h2>Cancelar tarea</h2>
                <p>#{task.animal.caravana} · {task.tipo}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeModal} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>
            <form className="user-form" onSubmit={handleCancelSubmit}>
              <div className="form-warning">
                La tarea quedara CANCELADA. No se modificaran eventos existentes ni se borrara historial.
              </div>
              <label>
                <span>Observacion opcional</span>
                <textarea
                  value={cancelObservation}
                  onChange={(event) => setCancelObservation(event.target.value)}
                  rows={4}
                />
              </label>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal} disabled={isSaving}>
                  Volver
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  <Trash2 size={18} />
                  {isSaving ? 'Cancelando...' : 'Cancelar tarea'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
