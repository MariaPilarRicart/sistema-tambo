import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, RefreshCcw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ApiError } from '../services/apiClient';
import { getAgenda } from '../services/agendaService';
import { AgendaTaskActions } from '../components/ui/AgendaTaskActions';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { useScrollToSection } from '../hooks/useScrollToSection';
import { compareByDateStatusName, formatDate, statusClass } from '../utils/display';
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
const today = new Date().toISOString().slice(0, 10);

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

interface AgendaPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function AgendaPage({ authToken, currentUser, onUnauthorized }: AgendaPageProps) {
  const [searchParams] = useSearchParams();
  const [agenda, setAgenda] = useState<AgendaTarea[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedStatus, setSelectedStatus] = useState<'' | EstadoTareaCalculado>('');
  const [selectedType, setSelectedType] = useState<'' | TipoTarea>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const agendaVisible = useMemo(() => {
    const tipoFilter = selectedType || searchParams.get('tipo') as TipoTarea | null;
    const estadoFilter = selectedStatus || searchParams.get('estado');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const excluirTipo = searchParams.get('excluirTipo') as TipoTarea | null;

    return agenda
      .filter((task) => {
        if (tipoFilter && taskOrder.includes(tipoFilter) && task.tipo !== tipoFilter) return false;
        if (excluirTipo && task.tipo === excluirTipo) return false;
        if (estadoFilter && task.estadoCalculado !== estadoFilter) return false;
        if (!taskMatchesRange(task, fechaDesde, fechaHasta)) return false;
        return true;
      })
      .sort((left, right) =>
        compareByDateStatusName(
          left,
          right,
          (task) => task.fechaObjetivo ?? task.fechaProgramada,
          (task) => task.estadoCalculado,
          (task) => `${task.tipo} ${task.animal.caravana}`,
        ),
      );
  }, [agenda, searchParams, selectedStatus, selectedType]);

  const agendaDelDia = useMemo(
    () => agendaVisible.filter((task) => taskMatchesRange(task, selectedDate, selectedDate)),
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

  useEffect(() => {
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    if (fechaDesde && fechaDesde === fechaHasta) setSelectedDate(fechaDesde);
  }, [searchParams]);

  useDataChangedRefresh(() => loadAgenda(), [authToken, selectedStatus, selectedType]);
  useScrollToSection(searchParams.get('tipo') || searchParams.get('estado') ? 'agenda-listado-section' : null, [searchParams, agendaVisible.length]);

  function exportAgendaPdf() {
    if (agendaDelDia.length === 0) {
      setError('No hay tareas para exportar con los filtros seleccionados.');
      return;
    }

    setError('');
    const doc = new jsPDF();
    const generatedDate = new Date().toLocaleDateString('es-AR');
    const selectedStatusLabel = selectedStatus ? statusLabels[selectedStatus] : 'Todos';
    const selectedTypeLabel = selectedType ? taskLabels[selectedType] : 'Todos';

    doc.setFontSize(16);
    doc.text('Agenda pendiente', 14, 16);
    doc.setFontSize(10);
    doc.text(`Fecha: ${formatDate(selectedDate)}`, 14, 25);
    doc.text(`Estado: ${selectedStatusLabel}`, 14, 31);
    doc.text(`Tipo de tarea: ${selectedTypeLabel}`, 14, 37);
    doc.text(`Generado el: ${generatedDate}`, 14, 43);

    let startY = 52;
    const groups = selectedType
      ? [{ tipo: selectedType, tasks: agendaDelDia.filter((task) => task.tipo === selectedType) }]
      : taskOrder
        .map((tipo) => ({ tipo, tasks: agendaDelDia.filter((task) => task.tipo === tipo) }))
        .filter((group) => group.tasks.length > 0);

    groups.forEach((group) => {
      doc.setFontSize(12);
      doc.text(taskLabels[group.tipo].toUpperCase(), 14, startY);
      autoTable(doc, {
        startY: startY + 4,
        head: [['Fecha', 'Tarea', 'Animal / Caravana', 'Categoría', 'Lote', 'Estado']],
        body: group.tasks.map((task) => [
          formatDate(task.fechaObjetivo ?? task.fechaProgramada),
          taskLabels[task.tipo],
          task.animal?.caravana ? `#${task.animal.caravana}` : '-',
          task.animal?.categoriaAnimal ?? '-',
          task.animal?.lote?.nombre ?? '-',
          statusLabels[task.estadoCalculado] ?? task.estadoCalculado,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [5, 150, 105] },
      });
      startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
        : startY + 20;
    });

    doc.save(`agenda-${selectedDate}.pdf`);
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
            <span>Seleccionar dia</span>
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
          <button type="button" className="secondary-button" onClick={() => { setSelectedDate(today); setSelectedStatus(''); setSelectedType(''); }}>Limpiar</button>
          <button type="button" className="secondary-button" onClick={exportAgendaPdf}><Download size={16} />Exportar PDF</button>
        </form>
      </section>

      <section className="panel" id="eventos-section">
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
                    <td>{formatDate(task.fechaObjetivo ?? task.fechaProgramada)}</td>
                    <td>{task.tipo}</td>
                    <td><strong>#{task.animal.caravana}</strong><span>{task.animal.categoriaAnimal}</span></td>
                    <td>{task.animal.lote.nombre}</td>
                    <td><span className={`status-pill ${statusClass(task.estadoCalculado)}`}>{task.estadoCalculado}</span></td>
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

      <div className="agenda-groups" id="agenda-listado-section">
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
                      <td>{formatDate(task.fechaObjetivo ?? task.fechaProgramada)}</td>
                      <td><strong>#{task.animal.caravana}</strong><span>{task.animal.categoriaAnimal}</span></td>
                      <td>{task.animal.lote.nombre}</td>
                      <td><span className={`status-pill ${statusClass(task.estadoCalculado)}`}>{task.estadoCalculado}</span></td>
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
