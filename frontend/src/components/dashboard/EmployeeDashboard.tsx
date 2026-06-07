import { Link } from 'react-router-dom';
import {
  CalendarClock,
  ClipboardList,
  HeartPulse,
  ListChecks,
  Milk,
  Search,
  Siren,
  Stethoscope,
  Syringe,
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
            <strong>{friendlyText(task.tipoTarea)}</strong>
            <p>
              {task.animal ? `Animal #${task.animal.caravana}` : 'Sin animal'} | Lote {taskPlace(task)}
            </p>
            <span>Vence: {formatDate(task.fechaProyectada)} | {friendlyText(task.estado)}</span>
          </div>
          <Link className="secondary-button" to={paths.agenda}>Ver agenda</Link>
        </article>
      ))}
    </div>
  );
}

function SummaryCard({
  action,
  title,
  value,
}: {
  action: string;
  title: string;
  value: number;
}) {
  return (
    <article className="operative-card">
      <strong>{value}</strong>
      <span>{title}</span>
      <p>{action}</p>
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
    { title: 'Tareas vencidas', value: resumen.tareasVencidas, action: 'Revisar primero.' },
    { title: 'Tareas para hoy', value: resumen.tareasHoy, action: 'Completar durante la jornada.' },
    { title: 'Proximos 7 dias', value: resumen.tareasProximos7Dias.length, action: 'Organizar el trabajo cercano.' },
    { title: 'Tactos pendientes', value: resumen.tactosPendientes, action: 'Control reproductivo pendiente.' },
    { title: 'Secados pendientes', value: resumen.secadosPendientes, action: 'Preparar secado.' },
    { title: 'Partos pendientes', value: resumen.partosPendientes, action: 'Seguimiento de partos.' },
  ];

  const quickLinks = [
    { label: 'Registrar evento', to: paths.events, icon: Stethoscope },
    { label: 'Registrar produccion', to: paths.production, icon: Milk },
    { label: 'Registrar alimentacion', to: paths.feed, icon: Utensils },
    { label: 'Ver agenda', to: paths.agenda, icon: CalendarClock },
    { label: 'Buscar animal', to: paths.herd, icon: Search },
    { label: 'Ver vacunacion', to: paths.vaccination, icon: Syringe },
    { label: 'Ver listados', to: paths.listings, icon: ListChecks },
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

      <section className="operative-summary-grid">
        {summary.map((item) => (
          <SummaryCard key={item.title} {...item} />
        ))}
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
              <h2>Proximos 7 dias</h2>
              <p>Tareas operativas programadas.</p>
            </div>
          </div>
          <TaskList
            emptyMessage="No hay tareas programadas para los proximos 7 dias."
            tasks={resumen.tareasProximos7Dias}
          />
        </section>

        <section className="panel">
          <div className="dashboard-card-heading">
            <div>
              <h2>Alertas operativas</h2>
              <p>Mensajes simples para resolver o avisar.</p>
            </div>
          </div>
          {resumen.alertasOperativas.length === 0 ? (
            <p className="table-empty">Sin alertas operativas por ahora.</p>
          ) : (
            <div className="alert-list">
              {resumen.alertasOperativas.map((alerta) => (
                <article className={`alert-card alert-${alerta.severidad === 'CRITICA' ? 'critical' : alerta.severidad === 'INFO' ? 'info' : 'warning'}`} key={`${alerta.titulo}-${alerta.accionRuta}`}>
                  <Siren size={18} />
                  <div>
                    <strong>{alerta.titulo}</strong>
                    <p>{alerta.detalle}</p>
                    <Link className="dashboard-alert-action" to={alerta.accionRuta}>{alerta.accionLabel}</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Accesos rapidos</h2>
            <p>Acciones frecuentes de carga y consulta.</p>
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
              <h2>Carga del dia</h2>
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
