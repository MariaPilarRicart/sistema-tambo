import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, ClipboardList, RefreshCcw } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getListadosOperativos } from '../services/agendaService';
import type { AgendaTarea, ListadosOperativos } from '../types/agenda';

const emptyListados: ListadosOperativos = {
  vencidas: [],
  hoy: [],
  proximas: [],
  tactos: [],
  secados: [],
  partos: [],
  altasPostParto: [],
};

const sections: Array<{ key: keyof ListadosOperativos; title: string; description: string }> = [
  { key: 'vencidas', title: 'Vencidas', description: 'Tareas pendientes con fecha anterior a hoy.' },
  { key: 'hoy', title: 'Hoy', description: 'Tareas pendientes programadas para hoy.' },
  { key: 'proximas', title: 'Proximas', description: 'Tareas pendientes con fecha futura.' },
  { key: 'tactos', title: 'Tactos', description: 'Animales a tactar.' },
  { key: 'secados', title: 'Secados', description: 'Animales proximos a secado.' },
  { key: 'partos', title: 'Partos', description: 'Animales proximos a parto.' },
  { key: 'altasPostParto', title: 'Altas post parto', description: 'Revisiones post parto pendientes.' },
];

interface ListingsPageProps {
  authToken: string | null;
  onUnauthorized: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function TaskTable({ tasks }: { tasks: AgendaTarea[] }) {
  if (tasks.length === 0) {
    return <p className="table-empty">Sin tareas para mostrar.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="users-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tarea</th>
            <th>Animal</th>
            <th>Lote</th>
            <th>Estado reproductivo</th>
            <th>Estado tarea</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>{formatDate(task.fechaProgramada)}</td>
              <td>{task.tipo}</td>
              <td>
                <Link className="table-link" to={`/rodeos/${task.animal.id}`}>#{task.animal.caravana}</Link>
                <span>{task.animal.categoria}</span>
              </td>
              <td>{task.animal.lote.nombre}</td>
              <td>{task.animal.estadoReproductivo}</td>
              <td><span className="status-pill status-active">{task.estado}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListingsPage({ authToken, onUnauthorized }: ListingsPageProps) {
  const [listados, setListados] = useState<ListadosOperativos>(emptyListados);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const summaryCards = useMemo(
    () => [
      { title: 'Vencidas', value: listados.vencidas.length, icon: AlertTriangle, tone: 'rose' },
      { title: 'Hoy', value: listados.hoy.length, icon: CalendarClock, tone: 'blue' },
      { title: 'Proximas', value: listados.proximas.length, icon: CalendarClock, tone: 'emerald' },
      { title: 'Tactos', value: listados.tactos.length, icon: ClipboardList, tone: 'indigo' },
      { title: 'Secados', value: listados.secados.length, icon: ClipboardList, tone: 'amber' },
      { title: 'Partos', value: listados.partos.length, icon: ClipboardList, tone: 'pink' },
    ],
    [listados],
  );

  async function loadListados() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      setListados(await getListadosOperativos(authToken));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onUnauthorized();
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los listados operativos.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadListados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Listados Operativos</h2>
          <p>Tareas pendientes organizadas para el trabajo diario del tambo.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadListados()} aria-label="Actualizar listados">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}

      <div className="operative-summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="metric-card operative-card" key={card.title}>
              <div className="metric-card-top">
                <div className={`metric-icon metric-icon-${card.tone}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="metric-title">{card.title}</p>
              <strong className="metric-value">{card.value}</strong>
            </article>
          );
        })}
      </div>

      {isLoading && <p className="table-empty">Cargando listados...</p>}

      <div className="agenda-groups">
        {sections.map((section) => (
          <section className="panel" key={section.key}>
            <div className="panel-header">
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <span className="panel-chip">{listados[section.key].length}</span>
            </div>
            <TaskTable tasks={listados[section.key]} />
          </section>
        ))}
      </div>
    </div>
  );
}
