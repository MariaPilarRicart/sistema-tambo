import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, History, Search, Siren, Stethoscope } from 'lucide-react';
import { AgendaTaskActions } from '../ui/AgendaTaskActions';
import { paths } from '../../routes/paths';
import type { AgendaTarea, EstadoTarea, TipoTarea } from '../../types/agenda';
import type { AuthUser } from '../../types/auth';
import type { DashboardResumen, DashboardTareaDetalle } from '../../types/dashboard';

interface EmployeeDashboardProps {
  resumen: DashboardResumen;
  authToken: string | null;
  currentUser: AuthUser | null;
  onChanged: () => void;
  onUnauthorized: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function taskToAgendaTask(task: DashboardTareaDetalle): AgendaTarea {
  return {
    id: task.id,
    tipo: task.tipoTarea as TipoTarea,
    fechaProgramada: task.fechaProyectada,
    fechaRealizacion: null,
    estado: task.estado as EstadoTarea,
    descripcion: task.descripcion,
    animalId: task.animal?.id ?? 0,
    eventoOrigenId: null,
    eventoCierreId: null,
    animal: {
      id: task.animal?.id ?? 0,
      caravana: task.animal?.caravana ?? '-',
      categoria: 'VACA',
      estadoReproductivo: 'NO_APLICA',
      estadoAnimal: 'ACTIVO',
      activo: true,
      lote: task.animal?.lote ?? { id: 0, nombre: '-' },
    },
  };
}

function TaskList({
  authToken,
  currentUser,
  emptyMessage,
  onChanged,
  onUnauthorized,
  tasks,
}: {
  authToken: string | null;
  currentUser: AuthUser | null;
  emptyMessage: string;
  onChanged: () => void;
  onUnauthorized: () => void;
  tasks: DashboardTareaDetalle[];
}) {
  if (tasks.length === 0) return <p className="table-empty">{emptyMessage}</p>;

  return (
    <div className="employee-task-list">
      {tasks.map((task) => (
        <article className="employee-task-card" key={task.id}>
          <div>
            <strong>{task.tipoTarea}</strong>
            <p>
              {task.animal ? `#${task.animal.caravana}` : 'Sin animal'} · {task.animal?.lote?.nombre ?? 'Sin lote'}
            </p>
            <span>{formatDate(task.fechaProyectada)} · {task.estado}</span>
          </div>
          {task.animal && (
            <AgendaTaskActions
              authToken={authToken}
              currentUser={currentUser}
              task={taskToAgendaTask(task)}
              onChanged={onChanged}
              onUnauthorized={onUnauthorized}
              fichaLinkState={{ from: paths.dashboard, label: 'Volver al dashboard' }}
            />
          )}
        </article>
      ))}
    </div>
  );
}

export function EmployeeDashboard({
  resumen,
  authToken,
  currentUser,
  onChanged,
  onUnauthorized,
}: EmployeeDashboardProps) {
  const operativeAlerts = [
    ...resumen.alertasAlimentacion.slice(0, 3).map((alerta) => `Avisar al administrador: ${alerta.mensaje}`),
    ...resumen.alertasSanitarias.slice(0, 3).map((alerta) => `${alerta.tipo} pendiente de registrar.`),
    ...(resumen.tareasVencidas > 0 ? ['Hay tareas vencidas en agenda.'] : []),
  ];

  const quickLinks = [
    { label: 'Buscar animal', to: paths.herd, icon: Search },
    { label: 'Registrar evento', to: paths.events, icon: Stethoscope },
    { label: 'Ver agenda', to: paths.agenda, icon: CalendarDays },
    { label: 'Ver listados', to: paths.listings, icon: ClipboardList },
    { label: 'Ver historial', to: paths.events, icon: History },
  ];

  return (
    <>
      <section className="panel employee-primary-panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Tareas de hoy</h2>
            <p>Pendientes de hoy y vencidas.</p>
          </div>
          <Link className="panel-chip" to={paths.agenda}>Ver agenda</Link>
        </div>
        <TaskList
          authToken={authToken}
          currentUser={currentUser}
          emptyMessage="No hay tareas pendientes para hoy."
          onChanged={onChanged}
          onUnauthorized={onUnauthorized}
          tasks={resumen.tareasHoyDetalle}
        />
      </section>

      <div className="dashboard-two-column employee-grid">
        <section className="panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Proximos 7 dias</h2>
              <p>Tareas operativas programadas.</p>
            </div>
          </div>
          <TaskList
            authToken={authToken}
            currentUser={currentUser}
            emptyMessage="No hay proximas tareas en los proximos 7 dias."
            onChanged={onChanged}
            onUnauthorized={onUnauthorized}
            tasks={resumen.tareasProximos7Dias}
          />
        </section>

        <section className="panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Alertas operativas</h2>
              <p>Mensajes simples para avisar o registrar.</p>
            </div>
          </div>
          {operativeAlerts.length === 0 ? (
            <p className="table-empty">Sin alertas operativas.</p>
          ) : (
            <div className="alert-list">
              {operativeAlerts.map((alerta) => (
                <div className="alert-card alert-warning" key={alerta}>
                  <Siren size={18} />
                  <div>
                    <strong>Atencion</strong>
                    <p>{alerta}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Accesos rapidos</h2>
            <p>Operaciones frecuentes.</p>
          </div>
        </div>
        <div className="employee-quick-grid">
          {quickLinks.map(({ icon: Icon, label, to }) => (
            <Link className="employee-quick-card" to={to} key={label}>
              <Icon size={22} />
              <strong>{label}</strong>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
