import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getAgendaPendiente } from '../services/agendaService';
import type { AgendaTarea, TipoTarea } from '../types/agenda';

const taskOrder: TipoTarea[] = ['TACTO', 'SECADO', 'PARTO', 'ALTA_POST_PARTO', 'VACUNACION', 'CONTROL_CLINICO'];

interface AgendaPageProps {
  authToken: string | null;
  onUnauthorized: () => void;
}

export function AgendaPage({ authToken, onUnauthorized }: AgendaPageProps) {
  const [agenda, setAgenda] = useState<AgendaTarea[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const groupedAgenda = useMemo(
    () =>
      taskOrder
        .map((tipo) => ({
          tipo,
          tasks: agenda.filter((task) => task.tipo === tipo),
        }))
        .filter((group) => group.tasks.length > 0),
    [agenda],
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
                  </tr>
                </thead>
                <tbody>
                  {group.tasks.map((task) => (
                    <tr key={task.id}>
                      <td>{new Date(task.fechaProgramada).toLocaleDateString()}</td>
                      <td><strong>#{task.animal.caravana}</strong><span>{task.animal.categoria}</span></td>
                      <td>{task.animal.lote.nombre}</td>
                      <td><span className="status-pill status-active">{task.estado}</span></td>
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
