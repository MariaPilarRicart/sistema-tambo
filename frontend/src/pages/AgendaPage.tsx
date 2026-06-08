import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getAgendaPendiente } from '../services/agendaService';
import { AgendaTaskActions } from '../components/ui/AgendaTaskActions';
import type { AgendaTarea, TipoTarea } from '../types/agenda';
import type { AuthUser } from '../types/auth';

const taskOrder: TipoTarea[] = ['TACTO', 'SECADO', 'PARTO', 'ALTA_POST_PARTO', 'VACUNACION', 'CONTROL_CLINICO'];
const today = new Date().toISOString().slice(0, 10);

interface AgendaPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function AgendaPage({ authToken, currentUser, onUnauthorized }: AgendaPageProps) {
  const [searchParams] = useSearchParams();
  const [agenda, setAgenda] = useState<AgendaTarea[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const agendaVisible = useMemo(() => {
    const tipoFilter = searchParams.get('tipo') as TipoTarea | null;
    return tipoFilter && taskOrder.includes(tipoFilter)
      ? agenda.filter((task) => task.tipo === tipoFilter)
      : agenda;
  }, [agenda, searchParams]);

  const agendaDelDia = useMemo(
    () => agendaVisible.filter((task) => task.fechaProgramada.slice(0, 10) === selectedDate),
    [agendaVisible, selectedDate],
  );

  const groupedAgenda = useMemo(
    () => (
      taskOrder
        .map((tipo) => ({
          tipo,
          tasks: agendaVisible.filter((task) => task.tipo === tipo),
        }))
        .filter((group) => group.tasks.length > 0)
    ),
    [agendaVisible],
  );

  async function loadAgenda() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      setAgenda(await getAgendaPendiente(authToken));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la agenda.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Agenda pendiente</h2>
          <p>Tareas generadas automaticamente por eventos.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadAgenda()} aria-label="Actualizar agenda">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {isLoading && <p className="table-empty">Cargando agenda...</p>}

      <section className="panel herd-filters">
        <form className="filters-form agenda-date-form">
          <label className="filter-field">
            <span>Seleccionar dia</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <button type="button" className="secondary-button" onClick={() => setSelectedDate(today)}>Limpiar</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Agenda del dia</h2>
            <p>{agendaDelDia.length} tareas pendientes para la fecha seleccionada.</p>
          </div>
          <button type="button" className="icon-button" onClick={() => void loadAgenda()} aria-label="Actualizar agenda del dia">
            <RefreshCcw size={18} />
          </button>
        </div>
        {agendaDelDia.length === 0 ? <p className="table-empty">Sin tareas para el dia seleccionado.</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tarea</th>
                  <th>Animal</th>
                  <th>Lote</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {agendaDelDia.map((task) => (
                  <tr key={task.id}>
                    <td>{new Date(task.fechaProgramada).toLocaleDateString()}</td>
                    <td>{task.tipo}</td>
                    <td><strong>#{task.animal.caravana}</strong><span>{task.animal.categoriaAnimal}</span></td>
                    <td>{task.animal.lote.nombre}</td>
                    <td><span className="status-pill status-active">{task.estado}</span></td>
                    <td>
                      <AgendaTaskActions
                        authToken={authToken}
                        currentUser={currentUser}
                        task={task}
                        onChanged={() => void loadAgenda()}
                        onUnauthorized={onUnauthorized}
                        showEventAction={false}
                        fichaLinkState={{ from: '/agenda', label: 'Volver a Agenda' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!isLoading && groupedAgenda.length === 0 && (
        <section className="placeholder-page">
          <h2>Sin tareas pendientes</h2>
          <p>No hay tareas pendientes para mostrar.</p>
        </section>
      )}

      <div className="agenda-groups">
        {groupedAgenda.map((group) => (
          <section className="panel" key={group.tipo}>
            <div className="panel-header">
              <div>
                <h2>{group.tipo}</h2>
                <p>{group.tasks.length} tareas pendientes.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Animal</th>
                    <th>Lote</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tasks.map((task) => (
                    <tr key={task.id}>
                      <td>{new Date(task.fechaProgramada).toLocaleDateString()}</td>
                      <td><strong>#{task.animal.caravana}</strong><span>{task.animal.categoriaAnimal}</span></td>
                      <td>{task.animal.lote.nombre}</td>
                      <td><span className="status-pill status-active">{task.estado}</span></td>
                      <td>
                        <AgendaTaskActions
                          authToken={authToken}
                          currentUser={currentUser}
                          task={task}
                          onChanged={() => void loadAgenda()}
                          onUnauthorized={onUnauthorized}
                          showEventAction={false}
                          fichaLinkState={{ from: '/agenda', label: 'Volver a Agenda' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
