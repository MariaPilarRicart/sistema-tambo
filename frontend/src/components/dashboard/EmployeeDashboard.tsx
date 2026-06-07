import { Link } from 'react-router-dom';
import {
  ClipboardList,
  HeartPulse,
  Utensils,
} from 'lucide-react';
import { paths } from '../../routes/paths';
import type { DashboardResumen, DashboardTareaDetalle } from '../../types/dashboard';

interface EmployeeDashboardProps {
  resumen: DashboardResumen;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function friendlyText(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function taskPlace(task: DashboardTareaDetalle) {
  if (task.animal?.lote?.nombre) return task.animal.lote.nombre;
  if (task.lote?.nombre) return task.lote.nombre;
  return 'Sin lote';
}

function taskBadge(task: DashboardTareaDetalle) {
  const type = task.tipoTarea.toUpperCase();
  if (type.includes('AFTOSA') || type.includes('BRUCELOSIS') || type.includes('TUBERCULINA') || type.includes('VACUN') || type.includes('CLINICO')) {
    return 'Vacunación';
  }
  if (type.includes('ALIMENT')) return 'Alimentación';
  if (type.includes('PRODUC')) return 'Producción';
  return 'Agenda';
}

function TaskList({
  emptyMessage,
  tasks,
}: {
  emptyMessage: string;
  tasks: DashboardTareaDetalle[];
}) {
  if (tasks.length === 0) return <p className="table-empty">{emptyMessage}</p>;

  return (
    <div className="employee-task-list">
      {tasks.slice(0, 5).map((task) => (
        <article className="employee-task-card" key={task.id}>
          <div>
            <div className="employee-task-title">
              <strong>{friendlyText(task.tipoTarea)}</strong>
              <span>{taskBadge(task)}</span>
            </div>
            <p>
              {task.animal ? `Animal #${task.animal.caravana}` : 'Sin animal'} | Lote {taskPlace(task)}
            </p>
            <small>Vence: {formatDate(task.fechaProyectada)}</small>
            <small>Estado: {friendlyText(task.estado)}</small>
          </div>
          <Link className="secondary-button" to={paths.agenda}>Ver agenda</Link>
        </article>
      ))}
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <article className="employee-summary-card">
      <strong>{value}</strong>
      <span>{title}</span>
    </article>
  );
}

export function EmployeeDashboard({ resumen }: EmployeeDashboardProps) {
  const priority = resumen.tareasVencidas > 0
    ? {
        message: 'Hay tareas vencidas. Revisa primero la agenda.',
        severity: 'Critica',
        action: 'Ver tareas vencidas',
        className: 'employee-priority-critical',
      }
    : resumen.tareasHoy > 0
      ? {
          message: 'Tenes tareas programadas para hoy.',
          severity: 'Media',
          action: 'Ver tareas de hoy',
          className: 'employee-priority-warning',
        }
      : {
          message: 'No hay tareas urgentes para hoy.',
          severity: 'Normal',
          action: 'Ver agenda',
          className: 'employee-priority-ok',
        };

  const summary = [
    { title: 'Tareas vencidas', value: resumen.tareasVencidas },
    { title: 'Tareas para hoy', value: resumen.tareasHoy },
    { title: 'Proximos 7 dias', value: resumen.tareasProximos7Dias.length },
    { title: 'Tactos pendientes', value: resumen.tactosPendientes },
    { title: 'Secados pendientes', value: resumen.secadosPendientes },
    { title: 'Partos pendientes', value: resumen.partosPendientes },
  ];

  const workGroups = [
    { title: 'Proximos partos', tasks: resumen.proximosTrabajos.partos },
    { title: 'Vacas a secar', tasks: resumen.proximosTrabajos.secados },
    { title: 'Tactos pendientes', tasks: resumen.proximosTrabajos.tactos },
  ];

  return (
    <>
      <section className={`panel employee-priority-panel ${priority.className}`}>
        <div className="dashboard-card-heading">
          <div>
            <h2>Prioridad del dia</h2>
            <p>{priority.severity}</p>
          </div>
          <Link className="primary-button" to={paths.agenda}>{priority.action}</Link>
        </div>
        <p className="employee-priority-message">{priority.message}</p>
      </section>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Resumen operativo</h2>
            <p>Indicadores principales de trabajo diario.</p>
          </div>
        </div>
        <div className="employee-summary-grid">
          {summary.map((item) => (
            <SummaryCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="panel employee-primary-panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Tareas prioritarias</h2>
            <p>Vencidas, de hoy y proximas, en ese orden.</p>
          </div>
          <Link className="panel-chip" to={paths.agenda}>Ver agenda</Link>
        </div>
        <TaskList
          emptyMessage="No hay tareas pendientes importantes."
          tasks={resumen.tareasPrioritarias}
        />
      </section>

      <div className="dashboard-two-column employee-grid">
        <section className="panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Proximos trabajos</h2>
              <p>Animales que requieren seguimiento cercano.</p>
            </div>
          </div>
          <div className="employee-work-groups">
            {workGroups.map((group) => (
              <article className="employee-work-group" key={group.title}>
                <h3>{group.title}</h3>
                {group.tasks.length === 0 ? (
                  <p className="table-empty">Sin pendientes.</p>
                ) : (
                  group.tasks.slice(0, 3).map((task) => (
                    <div className="employee-work-item" key={task.id}>
                      <span>{friendlyText(task.tipoTarea)}</span>
                      <strong>{task.animal ? `#${task.animal.caravana}` : taskPlace(task)}</strong>
                      <small>{formatDate(task.fechaProyectada)}</small>
                      <Link to={paths.agenda}>Ver agenda</Link>
                    </div>
                  ))
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Registros del dia</h2>
              <p>Estado simple de registros diarios.</p>
            </div>
          </div>
          <div className="employee-load-list">
            <article>
              <HeartPulse size={18} />
              <div>
                <strong>{resumen.cargaDia.produccionRegistrada ? 'Produccion registrada hoy' : 'Produccion pendiente de carga'}</strong>
                <Link to={paths.production}>{resumen.cargaDia.produccionRegistrada ? 'Ver produccion' : 'Registrar produccion'}</Link>
              </div>
            </article>
            <article>
              <Utensils size={18} />
              <div>
                <strong>{resumen.cargaDia.alimentacionRegistrada ? 'Alimentacion registrada hoy' : 'Alimentacion pendiente de carga'}</strong>
                <Link to={paths.feed}>{resumen.cargaDia.alimentacionRegistrada ? 'Ver alimentacion' : 'Registrar alimentacion'}</Link>
              </div>
            </article>
            <article>
              <ClipboardList size={18} />
              <div>
                <strong>{resumen.cargaDia.eventosRegistrados > 0 ? 'Hay eventos registrados hoy' : 'Sin eventos registrados hoy'}</strong>
                <Link to={paths.events}>{resumen.cargaDia.eventosRegistrados > 0 ? 'Ver eventos' : 'Registrar evento'}</Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    </>
  );
}
