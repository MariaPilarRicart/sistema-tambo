import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  HeartPulse,
  Utensils,
} from 'lucide-react';
import { paths } from '../../routes/paths';
import type { DashboardResumen, DashboardResumenSanidad, DashboardTareaDetalle } from '../../types/dashboard';

interface EmployeeDashboardProps {
  resumen: DashboardResumen;
}

type SummaryModalKey = 'overdue' | 'today' | 'next7';

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

function isAgendaTask(task: DashboardTareaDetalle) {
  return taskBadge(task) === 'Agenda';
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function isToday(value: string) {
  const today = startOfToday();
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

function sanitaryStatus(fechaObjetivo: string) {
  const today = startOfToday();
  const dueDate = new Date(fechaObjetivo);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today ? 'Vencida' : 'Próxima a vencer';
}

function SanitaryList({ tasks }: { tasks: DashboardResumenSanidad['tareas'] }) {
  const today = startOfToday();
  const nextFifteenDays = addDays(today, 15);
  const visibleTasks = [...tasks]
    .filter((task) => {
      const dueDate = new Date(task.fechaObjetivo);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= nextFifteenDays;
    })
    .sort((a, b) => {
      return new Date(a.fechaObjetivo).getTime() - new Date(b.fechaObjetivo).getTime();
    });
  const hasMore = visibleTasks.length > 5;

  if (visibleTasks.length === 0) return <p className="table-empty">Sin vencimientos sanitarios próximos.</p>;

  return (
    <div className="employee-task-list">
      {visibleTasks.slice(0, 5).map((task) => (
        <article className="employee-task-card" key={task.id}>
          <div>
            <div className="employee-task-title">
              <strong>{friendlyText(task.tipo)}</strong>
              <span>Vacunación</span>
            </div>
            <p>Lote: {task.lote ?? 'Sin lote'}</p>
            <small>Vence: {formatDate(task.fechaObjetivo)}</small>
            <small>Estado: {sanitaryStatus(task.fechaObjetivo)}</small>
          </div>
          <Link className="secondary-button" to={paths.vaccination}>Ver vacunación</Link>
        </article>
      ))}
      {hasMore && <p className="dashboard-section-note">Hay más vencimientos sanitarios pendientes de revisión.</p>}
    </div>
  );
}

function FeedingRecordsModal({
  onClose,
  records,
}: {
  onClose: () => void;
  records: DashboardResumen['resumenAlimentacion']['ultimosRegistros'];
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal-panel employee-summary-modal" role="dialog" aria-modal="true" aria-labelledby="employee-feed-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="dashboard-card-heading">
          <div>
            <h2 id="employee-feed-modal-title">Alimentaciones registradas hoy</h2>
            <p>Detalle disponible desde el módulo Alimentación.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar modal">
            X
          </button>
        </div>
        {records.length === 0 ? (
          <p className="table-empty">No hay alimentaciones registradas hoy.</p>
        ) : (
          <div className="employee-task-list">
            {records.map((record) => (
              <article className="employee-task-card" key={record.id}>
                <div>
                  <div className="employee-task-title">
                    <strong>{record.lote}</strong>
                    <span>Alimentación</span>
                  </div>
                  <p>Ración: {record.racion}</p>
                  <small>Fecha: {formatDate(record.fecha)}</small>
                  <small>Cantidad: {record.cantidadKg} kg</small>
                </div>
                <Link className="secondary-button" to={paths.feed}>Ver alimentación</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FeedingSection({
  onOpenDetails,
  resumen,
}: {
  onOpenDetails: () => void;
  resumen: DashboardResumen;
}) {
  const riskItems = resumen.resumenAlimentacion.insumosConRiesgo.slice(0, 3);
  const recordsToday = resumen.resumenAlimentacion.ultimosRegistros.filter((record) => isToday(record.fecha));
  const fedLots = new Set(recordsToday.map((record) => record.lote)).size;
  const exhaustedItems = resumen.resumenAlimentacion.insumosConRiesgo.filter((item) => item.estado === 'CRITICO');
  const lowStockCount = resumen.resumenAlimentacion.insumosBajoMinimo;

  return (
    <section className="panel">
      <div className="dashboard-card-heading">
        <div>
          <h2>Alimentación del día</h2>
          <p>Control de carga diaria y stock de alimento.</p>
        </div>
      </div>
      <div className="employee-feed-grid">
        <button className="employee-feed-card employee-feed-button" type="button" onClick={onOpenDetails}>
          <Utensils size={18} />
          <div>
            <span>Estado de carga</span>
            <strong>{recordsToday.length > 0 ? `${recordsToday.length} alimentaciones hoy` : 'No hay registros de alimentación para hoy'}</strong>
            <p>{recordsToday.length > 0 ? 'Consultá el detalle de cargas registradas.' : 'Si ya se alimentó, registrá la carga correspondiente.'}</p>
          </div>
        </button>
        <article className="employee-feed-card">
          <ClipboardList size={18} />
          <div>
            <span>Lotes alimentados</span>
            <strong>{fedLots}</strong>
            <p>{fedLots > 0 ? 'Lotes con registro de alimentación hoy.' : 'No hay lotes con registros de alimentación hoy.'}</p>
          </div>
        </article>
        <article className="employee-feed-card">
          <Utensils size={18} />
          <div>
            <span>Stock bajo</span>
            <strong>{lowStockCount}</strong>
            {riskItems.length > 0 ? (
              <ul className="employee-feed-list">
                {riskItems.map((item) => (
                  <li key={item.id}>{item.alimento}: {friendlyText(item.estado)}</li>
                ))}
              </ul>
            ) : (
              <p>No se detectan alimentos bajo mínimo.</p>
            )}
          </div>
        </article>
        <article className="employee-feed-card">
          <ClipboardList size={18} />
          <div>
            <span>Agotados</span>
            <strong>{exhaustedItems.length}</strong>
            <p>{exhaustedItems.length > 0 ? 'Hay insumos sin stock disponible.' : 'No hay insumos agotados reportados.'}</p>
          </div>
        </article>
      </div>
      <div className="employee-feed-actions">
        <Link className="secondary-button" to={paths.feed}>Registrar alimentación</Link>
        <Link className="secondary-button" to={paths.feed}>Ver alimentación</Link>
      </div>
    </section>
  );
}

function TaskList({
  emptyMessage,
  limit = 5,
  tasks,
}: {
  emptyMessage: string;
  limit?: number;
  tasks: DashboardTareaDetalle[];
}) {
  if (tasks.length === 0) return <p className="table-empty">{emptyMessage}</p>;

  return (
    <div className="employee-task-list">
      {tasks.slice(0, limit).map((task) => (
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
  onClick,
  title,
  value,
}: {
  onClick: () => void;
  title: string;
  value: number;
}) {
  return (
    <button className="employee-summary-card" type="button" onClick={onClick}>
      <strong>{value}</strong>
      <span>{title}</span>
    </button>
  );
}

export function EmployeeDashboard({ resumen }: EmployeeDashboardProps) {
  const [activeModal, setActiveModal] = useState<SummaryModalKey | null>(null);
  const [isFeedingModalOpen, setIsFeedingModalOpen] = useState(false);
  const agendaOverdueTasks = resumen.tareasVencidasDetalle.filter(isAgendaTask);
  const agendaTodayTasks = resumen.tareasHoyDetalle.filter(isAgendaTask);
  const agendaNextSevenDaysTasks = resumen.tareasProximos7Dias.filter(isAgendaTask);
  const priority = agendaOverdueTasks.length > 0
    ? {
        title: 'Hay tareas vencidas',
        message: 'Revisa el detalle desde el resumen operativo.',
        className: 'employee-priority-critical',
      }
    : agendaTodayTasks.length > 0
      ? {
          title: 'Hay tareas para hoy',
          message: 'Revisa el detalle desde el resumen operativo.',
          className: 'employee-priority-warning',
        }
      : {
          title: 'Estas al dia',
          message: 'No hay tareas urgentes para hoy.',
          className: 'employee-priority-ok',
        };

  const summary: Array<{ key: SummaryModalKey; title: string; value: number; tasks: DashboardTareaDetalle[] }> = [
    { key: 'overdue', title: 'Tareas vencidas', value: agendaOverdueTasks.length, tasks: agendaOverdueTasks },
    { key: 'today', title: 'Tareas para hoy', value: agendaTodayTasks.length, tasks: agendaTodayTasks },
    { key: 'next7', title: 'Proximos 7 dias', value: agendaNextSevenDaysTasks.length, tasks: agendaNextSevenDaysTasks },
  ];
  const modalSummary = summary.find((item) => item.key === activeModal);
  const feedingRecordsToday = resumen.resumenAlimentacion.ultimosRegistros.filter((record) => isToday(record.fecha));
  const sanitaryTasks = resumen.resumenSanidad.tareas;

  return (
    <>
      <section className={`panel employee-priority-panel ${priority.className}`}>
        <div className="dashboard-card-heading">
          <div>
            <h2>Prioridad del dia</h2>
          </div>
        </div>
        <p className="employee-priority-message">{priority.title}</p>
        <p className="employee-priority-subtext">{priority.message}</p>
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
            <SummaryCard
              key={item.title}
              title={item.title}
              value={item.value}
              onClick={() => setActiveModal(item.key)}
            />
          ))}
        </div>
      </section>

      <section className="panel employee-primary-panel">
        <div className="dashboard-card-heading">
          <div>
            <h2>Vacunaciones próximas a vencer</h2>
            <p>Certificados sanitarios que requieren revisión.</p>
          </div>
          <Link className="panel-chip" to={paths.vaccination}>Ver vacunación</Link>
        </div>
        <SanitaryList tasks={sanitaryTasks} />
      </section>

      <FeedingSection resumen={resumen} onOpenDetails={() => setIsFeedingModalOpen(true)} />

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
            <ClipboardList size={18} />
            <div>
              <strong>{resumen.cargaDia.eventosRegistrados > 0 ? 'Hay eventos registrados hoy' : 'Sin eventos registrados hoy'}</strong>
              <Link to={paths.events}>{resumen.cargaDia.eventosRegistrados > 0 ? 'Ver eventos' : 'Registrar evento'}</Link>
            </div>
          </article>
        </div>
      </section>

      {modalSummary && (
        <div className="modal-backdrop" role="presentation" onClick={() => setActiveModal(null)}>
          <section className="modal-panel employee-summary-modal" role="dialog" aria-modal="true" aria-labelledby="employee-summary-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-card-heading">
              <div>
                <h2 id="employee-summary-modal-title">{modalSummary.title}</h2>
                <p>Detalle operativo de agenda.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setActiveModal(null)} aria-label="Cerrar modal">
                X
              </button>
            </div>
            <TaskList
              emptyMessage="No hay tareas de agenda para mostrar."
              limit={modalSummary.tasks.length}
              tasks={modalSummary.tasks}
            />
          </section>
        </div>
      )}
      {isFeedingModalOpen && (
        <FeedingRecordsModal
          records={feedingRecordsToday}
          onClose={() => setIsFeedingModalOpen(false)}
        />
      )}
    </>
  );
}
