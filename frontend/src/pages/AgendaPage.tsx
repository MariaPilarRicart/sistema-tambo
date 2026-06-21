import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ApiError } from '../services/apiClient';
import { getAgenda } from '../services/agendaService';
import { AgendaTaskActions } from '../components/ui/AgendaTaskActions';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { formatDate, statusClass } from '../utils/display';
import type { AgendaTarea, EstadoTareaCalculado, TipoTarea } from '../types/agenda';
import type { AuthUser } from '../types/auth';

const taskOrder: TipoTarea[] = ['TACTO', 'SECADO', 'PARTO', 'ALTA_POST_PARTO', 'VACUNACION', 'CONTROL_CLINICO'];
const taskLabels: Record<TipoTarea, string> = {
  TACTO: 'Tacto',
  SECADO: 'Secado',
  PARTO: 'Parto',
  ALTA_POST_PARTO: 'Alta post parto',
  VACUNACION: 'Vacunación',
  CONTROL_CLINICO: 'Control clínico',
};
const taskTypeOptions: Array<{ value: '' | TipoTarea; label: string }> = [
  { value: '', label: 'Todos' },
  ...taskOrder.map((tipo) => ({ value: tipo, label: taskLabels[tipo] })),
];
const statusOptions: Array<{ value: '' | EstadoTareaCalculado; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'REALIZADA', label: 'Realizada' },
  { value: 'VENCIDA', label: 'Vencida' },
  { value: 'CANCELADA', label: 'Cancelada' },
];
const statusLabels: Record<EstadoTareaCalculado, string> = {
  PENDIENTE: 'Pendiente',
  PROGRAMADA: 'Programada',
  REALIZADA: 'Realizada',
  VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada',
};
const openStatuses: EstadoTareaCalculado[] = ['PENDIENTE', 'PROGRAMADA', 'VENCIDA'];
const statusSortOrder: Record<EstadoTareaCalculado, number> = {
  VENCIDA: 0,
  PENDIENTE: 1,
  PROGRAMADA: 1,
  REALIZADA: 2,
  CANCELADA: 3,
};

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function taskMatchesRange(task: AgendaTarea, fechaDesde?: string | null, fechaHasta?: string | null) {
  if (!fechaDesde && !fechaHasta) return true;
  const fechaProgramada = dateOnly(task.fechaProgramada);
  const fechaObjetivo = dateOnly(task.fechaObjetivo ?? task.fechaProgramada);
  const fechaRealizada = task.fechaRealizacion ? dateOnly(task.fechaRealizacion) : null;

  if (task.estadoCalculado === 'PENDIENTE') {
    if (fechaDesde && fechaObjetivo < fechaDesde) return false;
    if (fechaHasta && fechaProgramada > fechaHasta) return false;
    return true;
  }

  const referenceDate = task.estadoCalculado === 'REALIZADA' && fechaRealizada ? fechaRealizada : fechaObjetivo;
  if (fechaDesde && referenceDate < fechaDesde) return false;
  if (fechaHasta && referenceDate > fechaHasta) return false;
  return true;
}

function friendlyValue(value: string | null | undefined) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function taskDate(task: AgendaTarea) {
  return task.fechaObjetivo ?? task.fechaProgramada;
}

interface AgendaPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function AgendaPage({ authToken, currentUser, onUnauthorized }: AgendaPageProps) {
  const [agenda, setAgenda] = useState<AgendaTarea[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'' | EstadoTareaCalculado>('');
  const [selectedType, setSelectedType] = useState<'' | TipoTarea>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredTasks = useMemo(() => {
    return agenda
      .filter((task) => {
        if (selectedType && task.tipo !== selectedType) return false;
        if (selectedStatus) {
          if (task.estadoCalculado !== selectedStatus) return false;
        } else if (!openStatuses.includes(task.estadoCalculado)) {
          return false;
        }
        if (selectedDate && !taskMatchesRange(task, selectedDate, selectedDate)) return false;
        return true;
      })
      .sort((left, right) => {
        const statusDiff = statusSortOrder[left.estadoCalculado] - statusSortOrder[right.estadoCalculado];
        if (statusDiff !== 0) return statusDiff;
        const dateDiff = new Date(taskDate(left)).getTime() - new Date(taskDate(right)).getTime();
        if (dateDiff !== 0) return dateDiff;
        return `${left.tipo} ${left.animal?.caravana ?? ''}`.localeCompare(`${right.tipo} ${right.animal?.caravana ?? ''}`);
      });
  }, [agenda, selectedDate, selectedStatus, selectedType]);

  const hasFilters = Boolean(selectedDate || selectedStatus || selectedType);

  async function loadAgenda() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      setAgenda(await getAgenda(authToken, { estado: selectedStatus, tipo: selectedType }));
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
  }, [authToken, selectedStatus, selectedType]);

  useDataChangedRefresh(() => loadAgenda(), [authToken, selectedStatus, selectedType]);

  function exportAgendaPdf() {
    if (filteredTasks.length === 0) {
      setError('No hay tareas para exportar con los filtros seleccionados.');
      return;
    }

    setError('');
    const doc = new jsPDF();
    const generatedDate = new Date().toLocaleDateString('es-AR');
    const selectedStatusLabel = selectedStatus ? statusLabels[selectedStatus] : 'Todos';
    const selectedTypeLabel = selectedType ? taskLabels[selectedType] : 'Todos';

    doc.setFontSize(16);
    doc.text('Agenda de tareas', 14, 16);
    doc.setFontSize(10);
    doc.text(`Fecha: ${selectedDate ? formatDate(selectedDate) : 'Todas'}`, 14, 25);
    doc.text(`Estado: ${selectedStatusLabel}`, 14, 31);
    doc.text(`Tipo de tarea: ${selectedTypeLabel}`, 14, 37);
    doc.text(`Generado el: ${generatedDate}`, 14, 43);

    autoTable(doc, {
      startY: 52,
      head: [['Fecha', 'Tipo de tarea', 'Animal / Caravana', 'Categoría', 'Lote', 'Estado']],
      body: filteredTasks.map((task) => [
        formatDate(taskDate(task)),
        taskLabels[task.tipo],
        task.animal?.caravana ? `#${task.animal.caravana}` : '-',
        friendlyValue(task.animal?.categoriaAnimal),
        task.animal?.lote?.nombre ?? '-',
        statusLabels[task.estadoCalculado] ?? task.estadoCalculado,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [5, 150, 105] },
    });

    doc.save(`agenda-tareas-${selectedDate || 'todas'}.pdf`);
  }

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
            <span>Fecha</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Estado</span>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as '' | EstadoTareaCalculado)}>
              {statusOptions.map((option) => <option key={option.value || 'todos'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Tipo de tarea</span>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value as '' | TipoTarea)}>
              {taskTypeOptions.map((option) => <option key={option.value || 'todos'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={() => { setSelectedDate(''); setSelectedStatus(''); setSelectedType(''); }}>Limpiar</button>
          <button type="button" className="secondary-button" onClick={exportAgendaPdf}><Download size={16} />Exportar PDF</button>
        </form>
      </section>

      <section className="panel" id="agenda-listado-section">
        <div className="panel-header">
          <div>
            <h2>Agenda de tareas</h2>
            <p>{hasFilters ? `${filteredTasks.length} tareas encontradas.` : `${filteredTasks.length} tareas abiertas.`}</p>
          </div>
          <button type="button" className="icon-button" onClick={() => void loadAgenda()} aria-label="Actualizar agenda de tareas">
            <RefreshCcw size={18} />
          </button>
        </div>
        {filteredTasks.length === 0 ? <p className="table-empty">Sin tareas para los filtros seleccionados.</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo de tarea</th>
                  <th>Animal / Caravana</th>
                  <th>Categoría</th>
                  <th>Lote</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{formatDate(taskDate(task))}</td>
                    <td>{taskLabels[task.tipo]}</td>
                    <td>{task.animal?.caravana ? `#${task.animal.caravana}` : '-'}</td>
                    <td>{friendlyValue(task.animal?.categoriaAnimal)}</td>
                    <td>{task.animal?.lote?.nombre ?? '-'}</td>
                    <td><span className={`status-pill ${statusClass(task.estadoCalculado)}`}>{statusLabels[task.estadoCalculado] ?? task.estadoCalculado}</span></td>
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
    </div>
  );
}
