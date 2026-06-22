import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ApiError } from '../services/apiClient';
import { getAgenda } from '../services/agendaService';
import { AgendaTaskActions } from '../components/ui/AgendaTaskActions';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { formatDate, statusClass } from '../utils/display';
import {
  agendaDateOnly,
  agendaStatusLabels,
  agendaStatusSortOrder,
  getAgendaTaskDate,
  getEstadoOperativoAgenda,
  isOpenAgendaStatus,
} from '../utils/agendaStatus';
import type { AgendaTarea, EstadoTareaCalculado, TipoTarea } from '../types/agenda';
import type { AuthUser } from '../types/auth';

const taskOrder: TipoTarea[] = ['TACTO', 'SECADO', 'PARTO', 'ALTA_POST_PARTO', 'CONTROL_CLINICO'];
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
  { value: 'VENCIDA', label: 'Vencida' },
  { value: 'REALIZADA', label: 'Realizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];
function taskMatchesRange(task: AgendaTarea, fechaDesde?: string | null, fechaHasta?: string | null) {
  if (!fechaDesde && !fechaHasta) return true;
  const estadoOperativo = getEstadoOperativoAgenda(task);
  const fechaRealizada = task.fechaRealizacion ? agendaDateOnly(task.fechaRealizacion) : null;
  const referenceDate = estadoOperativo === 'REALIZADA' && fechaRealizada
    ? fechaRealizada
    : agendaDateOnly(getAgendaTaskDate(task));

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

function fileSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
        const estadoOperativo = getEstadoOperativoAgenda(task);
        if (selectedType && task.tipo !== selectedType) return false;
        if (selectedStatus) {
          if (estadoOperativo !== selectedStatus) return false;
        } else if (!isOpenAgendaStatus(estadoOperativo)) {
          return false;
        }
        if (selectedDate && !taskMatchesRange(task, selectedDate, selectedDate)) return false;
        return true;
      })
      .sort((left, right) => {
        const leftStatus = getEstadoOperativoAgenda(left);
        const rightStatus = getEstadoOperativoAgenda(right);
        const statusDiff = agendaStatusSortOrder[leftStatus] - agendaStatusSortOrder[rightStatus];
        if (statusDiff !== 0) return statusDiff;
        const dateDiff = new Date(getAgendaTaskDate(left)).getTime() - new Date(getAgendaTaskDate(right)).getTime();
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
      setAgenda(await getAgenda(authToken, { tipo: selectedType }));
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
  }, [authToken, selectedType]);

  useDataChangedRefresh(() => loadAgenda(), [authToken, selectedType]);

  function exportAgendaPdf() {
    if (filteredTasks.length === 0) {
      setError('No hay tareas para exportar con los filtros seleccionados.');
      return;
    }

    setError('');
    const doc = new jsPDF();
    const generatedDate = new Date().toLocaleDateString('es-AR');
    const selectedStatusLabel = selectedStatus ? agendaStatusLabels[selectedStatus] : 'Todos';
    const selectedTypeLabel = selectedType ? taskLabels[selectedType] : 'Todos';
    const selectedDateLabel = selectedDate ? formatDate(selectedDate) : 'Todas';
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [5, 150, 105];
    const mutedText: [number, number, number] = [75, 85, 99];
    const lightPanel: [number, number, number] = [243, 244, 246];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Agenda operativa', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Tareas operativas generadas por eventos y reglas del sistema.', 14, 22);

    doc.setFillColor(...lightPanel);
    doc.roundedRect(14, 34, pageWidth - 28, 24, 2, 2, 'F');
    doc.setTextColor(...mutedText);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Filtros aplicados', 18, 41);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${selectedDateLabel}`, 18, 49);
    doc.text(`Estado: ${selectedStatusLabel}`, 70, 49);
    doc.text(`Tipo de tarea: ${selectedTypeLabel}`, 118, 49);
    doc.text(`Generado el: ${generatedDate}`, 18, 55);

    autoTable(doc, {
      startY: 66,
      head: [['Fecha', 'Tipo de tarea', 'Animal / Caravana', 'Categoría', 'Lote', 'Estado']],
      body: filteredTasks.map((task) => [
        formatDate(getAgendaTaskDate(task)),
        taskLabels[task.tipo],
        task.animal?.caravana ? `#${task.animal.caravana}` : '-',
        friendlyValue(task.animal?.categoriaAnimal),
        task.animal?.lote?.nombre ?? '-',
        agendaStatusLabels[getEstadoOperativoAgenda(task)] ?? getEstadoOperativoAgenda(task),
      ]),
      margin: { left: 14, right: 14 },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: { top: 3, right: 2.5, bottom: 3, left: 2.5 },
        textColor: [31, 41, 55],
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
        valign: 'middle',
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 32 },
        2: { cellWidth: 34 },
        3: { cellWidth: 24 },
        5: { cellWidth: 24 },
      },
    });

    const typePart = selectedType ? `-${fileSlug(selectedTypeLabel)}` : '';
    const datePart = selectedDate || 'todos';
    doc.save(`agenda-operativa${typePart}-${datePart}.pdf`);
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Agenda operativa</h2>
          <p>Tareas operativas generadas automáticamente por eventos y reglas del sistema.</p>
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
                    <td>{formatDate(getAgendaTaskDate(task))}</td>
                    <td>{taskLabels[task.tipo]}</td>
                    <td>{task.animal?.caravana ? `#${task.animal.caravana}` : '-'}</td>
                    <td>{friendlyValue(task.animal?.categoriaAnimal)}</td>
                    <td>{task.animal?.lote?.nombre ?? '-'}</td>
                    <td>
                      <span className={`status-pill ${statusClass(getEstadoOperativoAgenda(task))}`}>
                        {agendaStatusLabels[getEstadoOperativoAgenda(task)] ?? getEstadoOperativoAgenda(task)}
                      </span>
                    </td>
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
