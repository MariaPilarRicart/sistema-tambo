import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, Eye, RefreshCcw, Syringe, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ApiError } from '../services/apiClient';
import { SanitaryRulesPanel } from '../components/ui/SanitaryRulesPanel';
import { useDataChangedRefresh } from '../hooks/useDataChangedRefresh';
import { getReglasSanitarias, type ReglaSanitaria, type TipoReglaSanitaria } from '../services/reglasSanitariasService';
import {
  getSanitaryApplications,
  getSanitaryPendingDetail,
  getSanitaryPendings,
  markSanitaryPendingDone,
  type EstadoSanitarioOperativo,
  type SanitaryApplication,
  type SanitaryPending,
  type SanitaryPendingLote,
} from '../services/vacunacionService';
import { formatDate, statusClass } from '../utils/display';
import type { AuthUser } from '../types/auth';

const tipoFuncionalOptions = [
  ['GUACHERA', 'Guachera'],
  ['ESCUELITA', 'Escuelita'],
  ['TERNERA_1', 'Ternera 1'],
  ['TERNERA_2', 'Ternera 2'],
  ['TORITOS', 'Toritos'],
  ['TOROS', 'Toros'],
  ['PRODUCCION', 'Producción'],
  ['SECAS', 'Secas'],
  ['PREPARTO', 'Preparto'],
  ['RECUPERACION', 'Recuperación'],
] as const;

const estadoOptions: Array<[EstadoSanitarioOperativo, string]> = [
  ['PROGRAMADA', 'Programada'],
  ['PENDIENTE', 'Pendiente'],
  ['VENCIDA', 'Vencida'],
];

const tipoLabels: Record<TipoReglaSanitaria, string> = {
  VACUNA: 'Vacuna',
  ANALISIS: 'Análisis',
};

const estadoLabels: Record<EstadoSanitarioOperativo, string> = {
  PROGRAMADA: 'Programada',
  PENDIENTE: 'Pendiente',
  VENCIDA: 'Vencida',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fileSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isOpenSanitaryStatus(status: EstadoSanitarioOperativo) {
  return status === 'PROGRAMADA' || status === 'PENDIENTE' || status === 'VENCIDA';
}

function drawPdfHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, 14, 22);
  doc.setTextColor(31, 41, 55);
}

function animalsByLoteRows(lotes: SanitaryPendingLote[]) {
  return lotes.flatMap((lote) => (
    lote.animales.length
      ? lote.animales.map((animal, index) => [index === 0 ? lote.nombre : '', `#${animal.caravana}`])
      : [[lote.nombre, 'Sin animales activos']]
  ));
}

function filterValue(value: string, fallback = 'Todos') {
  return value || fallback;
}

function applicationLoteRows(application: SanitaryApplication) {
  const lotes = new Map<string, string[]>();
  application.animales.forEach((animal) => {
    const lote = animal.loteSnapshot || '-';
    const caravanas = lotes.get(lote) ?? [];
    caravanas.push(animal.caravanaSnapshot);
    lotes.set(lote, caravanas);
  });

  return Array.from(lotes.entries()).map(([lote, caravanas]) => ({
    lote,
    caravanas: caravanas.sort((left, right) => left.localeCompare(right, 'es-AR', { numeric: true })),
  }));
}

interface VaccinationPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function VaccinationPage({ authToken, currentUser, onUnauthorized }: VaccinationPageProps) {
  const [reglas, setReglas] = useState<ReglaSanitaria[]>([]);
  const [pendientes, setPendientes] = useState<SanitaryPending[]>([]);
  const [aplicaciones, setAplicaciones] = useState<SanitaryApplication[]>([]);
  const [pendingFilters, setPendingFilters] = useState({
    reglaSanitariaId: '',
    tipo: '',
    tipoFuncional: '',
    estado: '',
    fechaMaximaDesde: '',
    fechaMaximaHasta: '',
  });
  const [historyFilters, setHistoryFilters] = useState({
    reglaSanitariaId: '',
    tipo: '',
    tipoFuncional: '',
    lote: '',
    fechaRealizadaDesde: '',
    fechaRealizadaHasta: '',
  });
  const [selectedPending, setSelectedPending] = useState<SanitaryPending | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<SanitaryApplication | null>(null);
  const [performTarget, setPerformTarget] = useState<SanitaryPending | null>(null);
  const [performValues, setPerformValues] = useState({ fechaRealizacion: todayIso(), observaciones: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = currentUser?.role === 'ADMIN';
  const canMarkDone = currentUser?.role === 'ADMIN' || currentUser?.role === 'EMPLEADO';

  const activeRules = useMemo(() => reglas.filter((regla) => regla.activo), [reglas]);

  function handleRequestError(requestError: unknown, fallback = 'No se pudo completar la operación.') {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  async function loadData() {
    if (!authToken) return;
    setIsLoading(true);
    setError('');
    try {
      const [nextReglas, nextPendientes, nextAplicaciones] = await Promise.all([
        getReglasSanitarias(authToken),
        getSanitaryPendings(authToken, pendingFilters),
        getSanitaryApplications(authToken, historyFilters),
      ]);
      setReglas(nextReglas);
      setPendientes(nextPendientes);
      setAplicaciones(nextAplicaciones);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar vacunación.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, pendingFilters, historyFilters]);

  useDataChangedRefresh(() => loadData(), [authToken, pendingFilters, historyFilters]);

  async function openPendingDetail(pending: SanitaryPending) {
    if (!authToken) return onUnauthorized();
    setError('');
    try {
      setSelectedPending(await getSanitaryPendingDetail(authToken, pending.id));
    } catch (detailError) {
      handleRequestError(detailError, 'No se pudo cargar el detalle del pendiente.');
    }
  }

  async function exportPendingFromRow(pending: SanitaryPending) {
    if (!authToken) return onUnauthorized();
    try {
      const detail = pending.lotes ? pending : await getSanitaryPendingDetail(authToken, pending.id);
      exportPendingPdf(detail);
    } catch (detailError) {
      handleRequestError(detailError, 'No se pudo exportar el pendiente sanitario.');
    }
  }

  function exportPendingPdf(pending: SanitaryPending) {
    if (!pending.lotes) return;
    const doc = new jsPDF();
    drawPdfHeader(doc, pending.reglaNombre, 'Pendiente sanitario por lote y tipo funcional.');
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 34, 182, 30, 2, 2, 'F');
    doc.setFontSize(9);
    doc.text(`Tipo: ${tipoLabels[pending.tipo]}`, 18, 43);
    doc.text(`Fecha máxima: ${formatDate(pending.fechaMaxima)}`, 18, 51);
    doc.text(`Tipo funcional: ${pending.tipoFuncionalLabel}`, 92, 43);
    doc.text(`Estado: ${estadoLabels[pending.estado]}`, 92, 51);
    doc.text(`Generado el: ${formatDate(new Date())}`, 18, 59);
    autoTable(doc, {
      startY: 74,
      head: [['Lote', 'Animal / Caravana']],
      body: animalsByLoteRows(pending.lotes),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save(`pendiente-sanitario-${fileSlug(pending.reglaNombre)}-${fileSlug(pending.tipoFuncionalLabel)}.pdf`);
  }

  function exportPendingListPdf() {
    if (pendientes.length === 0) {
      setError('No hay pendientes sanitarios para exportar con los filtros seleccionados.');
      return;
    }
    setError('');
    const selectedRule = reglas.find((regla) => String(regla.id) === pendingFilters.reglaSanitariaId);
    const selectedTipoFuncional = tipoFuncionalOptions.find(([value]) => value === pendingFilters.tipoFuncional)?.[1];
    const selectedEstado = estadoOptions.find(([value]) => value === pendingFilters.estado)?.[1];
    const doc = new jsPDF({ orientation: 'landscape' });
    drawPdfHeader(doc, 'Pendientes sanitarios', 'Listado de tareas sanitarias abiertas');

    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text(`Generado el: ${formatDate(new Date())}`, 14, 34);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 40, 269, 30, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Filtros aplicados', 18, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(`Regla sanitaria: ${selectedRule?.nombre ?? 'Todas'}`, 18, 56);
    doc.text(`Tipo sanitario: ${pendingFilters.tipo ? tipoLabels[pendingFilters.tipo as TipoReglaSanitaria] : 'Todos'}`, 18, 64);
    doc.text(`Tipo funcional: ${selectedTipoFuncional ?? 'Todos'}`, 104, 56);
    doc.text(`Estado: ${selectedEstado ?? 'Todos'}`, 104, 64);
    doc.text(`Fecha máxima desde: ${filterValue(formatDate(pendingFilters.fechaMaximaDesde), '-')}`, 190, 56);
    doc.text(`Fecha máxima hasta: ${filterValue(formatDate(pendingFilters.fechaMaximaHasta), '-')}`, 190, 64);

    autoTable(doc, {
      startY: 80,
      head: [['Regla sanitaria', 'Tipo', 'Tipo funcional', 'Fecha máxima', 'Estado', 'Lotes', 'Animales']],
      body: pendientes.map((pending) => [
        pending.reglaNombre,
        tipoLabels[pending.tipo],
        pending.tipoFuncionalLabel,
        formatDate(pending.fechaMaxima),
        estadoLabels[pending.estado],
        String(pending.cantidadLotes),
        String(pending.cantidadAnimales),
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });
    doc.save('pendientes-sanitarios.pdf');
  }

  function exportHistoryPdf() {
    if (aplicaciones.length === 0) {
      setError('No hay registros sanitarios para exportar con los filtros seleccionados.');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    drawPdfHeader(doc, 'Historial sanitario', 'Aplicaciones sanitarias realizadas según los filtros aplicados.');
    autoTable(doc, {
      startY: 36,
      head: [['Fecha realizada', 'Regla sanitaria', 'Tipo', 'Tipo funcional', 'Lotes', 'Animales', 'Usuario', 'Observaciones']],
      body: aplicaciones.map((item) => [
        formatDate(item.fechaRealizacion),
        item.reglaNombre,
        tipoLabels[item.tipo],
        item.tipoFuncionalLabel,
        Array.from(new Set(item.animales.map((animal) => animal.loteSnapshot))).join(', ') || '-',
        `${item.cantidadAnimales} animales`,
        item.usuario?.nombre ?? '-',
        item.observaciones ?? '-',
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save('historial-sanitario.pdf');
  }

  function openPerformModal(pending: SanitaryPending) {
    setPerformTarget(pending);
    setPerformValues({ fechaRealizacion: todayIso(), observaciones: '' });
    setError('');
    setSuccess('');
  }

  async function handlePerformSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken || !performTarget) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await markSanitaryPendingDone(authToken, performTarget.id, performValues);
      setSuccess(`Aplicación registrada. Próxima fecha máxima: ${formatDate(result.proximaFechaMaxima)}.`);
      setPerformTarget(null);
      setSelectedPending(null);
      await loadData();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo marcar el pendiente como realizado.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-page vaccination-page">
      <section className="settings-header">
        <div>
          <h2>Control de Vacunación</h2>
          <p>Reglas sanitarias, pendientes por lote y aplicaciones realizadas.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar vacunación">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <SanitaryRulesPanel authToken={authToken} onUnauthorized={onUnauthorized} onRulesChanged={() => loadData()} isAdmin={isAdmin} />

      <section className="panel vaccination-pending-section">
        <div className="panel-header">
          <div><h2>Pendientes sanitarios</h2><p>{pendientes.length} pendientes por regla y tipo funcional.</p></div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={exportPendingListPdf}><Download size={16} />Exportar PDF</button>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar pendientes"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field"><span>Regla sanitaria</span><select value={pendingFilters.reglaSanitariaId} onChange={(event) => setPendingFilters({ ...pendingFilters, reglaSanitariaId: event.target.value })}><option value="">Todas</option>{activeRules.map((regla) => <option key={regla.id} value={regla.id}>{regla.nombre}</option>)}</select></label>
          <label className="filter-field"><span>Tipo sanitario</span><select value={pendingFilters.tipo} onChange={(event) => setPendingFilters({ ...pendingFilters, tipo: event.target.value })}><option value="">Todos</option><option value="VACUNA">Vacuna</option><option value="ANALISIS">Análisis</option></select></label>
          <label className="filter-field"><span>Tipo funcional</span><select value={pendingFilters.tipoFuncional} onChange={(event) => setPendingFilters({ ...pendingFilters, tipoFuncional: event.target.value })}><option value="">Todos</option>{tipoFuncionalOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Estado</span><select value={pendingFilters.estado} onChange={(event) => setPendingFilters({ ...pendingFilters, estado: event.target.value })}><option value="">Todos</option>{estadoOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Fecha máxima desde</span><input type="date" value={pendingFilters.fechaMaximaDesde} onChange={(event) => setPendingFilters({ ...pendingFilters, fechaMaximaDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha máxima hasta</span><input type="date" value={pendingFilters.fechaMaximaHasta} onChange={(event) => setPendingFilters({ ...pendingFilters, fechaMaximaHasta: event.target.value })} /></label>
          <button type="button" className="secondary-button" onClick={() => setPendingFilters({ reglaSanitariaId: '', tipo: '', tipoFuncional: '', estado: '', fechaMaximaDesde: '', fechaMaximaHasta: '' })}>Limpiar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando pendientes...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead><tr><th>Regla sanitaria</th><th>Tipo</th><th>Tipo funcional</th><th>Fecha máxima</th><th>Estado operativo</th><th>Lotes</th><th>Animales</th><th>Acciones</th></tr></thead>
              <tbody>
                {pendientes.map((pending) => (
                  <tr key={pending.id}>
                    <td>{pending.reglaNombre}</td>
                    <td>{tipoLabels[pending.tipo]}</td>
                    <td>{pending.tipoFuncionalLabel}</td>
                    <td>{formatDate(pending.fechaMaxima)}</td>
                    <td><span className={`status-pill ${statusClass(pending.estado)}`}>{estadoLabels[pending.estado]}</span></td>
                    <td>{pending.cantidadLotes}</td>
                    <td>{pending.cantidadAnimales}</td>
                    <td><div className="table-actions"><button type="button" onClick={() => void openPendingDetail(pending)} aria-label="Ver detalle"><Eye size={16} /></button><button type="button" onClick={() => void exportPendingFromRow(pending)} aria-label="Exportar PDF"><Download size={16} /></button>{canMarkDone && isOpenSanitaryStatus(pending.estado) && <button type="button" onClick={() => openPerformModal(pending)} aria-label="Marcar realizado"><Syringe size={16} /></button>}</div></td>
                  </tr>
                ))}
                {pendientes.length === 0 && <tr><td colSpan={8}>Sin pendientes sanitarios para los filtros seleccionados.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel vaccination-history-section">
        <div className="panel-header">
          <div><h2>Historial sanitario</h2><p>{aplicaciones.length} aplicaciones realizadas.</p></div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={exportHistoryPdf}><Download size={16} />Exportar PDF</button>
            <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar historial"><RefreshCcw size={18} /></button>
          </div>
        </div>
        <form className="filters-form events-filters production-filters">
          <label className="filter-field"><span>Fecha realizada desde</span><input type="date" value={historyFilters.fechaRealizadaDesde} onChange={(event) => setHistoryFilters({ ...historyFilters, fechaRealizadaDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha realizada hasta</span><input type="date" value={historyFilters.fechaRealizadaHasta} onChange={(event) => setHistoryFilters({ ...historyFilters, fechaRealizadaHasta: event.target.value })} /></label>
          <label className="filter-field"><span>Regla sanitaria</span><select value={historyFilters.reglaSanitariaId} onChange={(event) => setHistoryFilters({ ...historyFilters, reglaSanitariaId: event.target.value })}><option value="">Todas</option>{reglas.map((regla) => <option key={regla.id} value={regla.id}>{regla.nombre}</option>)}</select></label>
          <label className="filter-field"><span>Tipo sanitario</span><select value={historyFilters.tipo} onChange={(event) => setHistoryFilters({ ...historyFilters, tipo: event.target.value })}><option value="">Todos</option><option value="VACUNA">Vacuna</option><option value="ANALISIS">Análisis</option></select></label>
          <label className="filter-field"><span>Tipo funcional</span><select value={historyFilters.tipoFuncional} onChange={(event) => setHistoryFilters({ ...historyFilters, tipoFuncional: event.target.value })}><option value="">Todos</option>{tipoFuncionalOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Lote</span><input value={historyFilters.lote} onChange={(event) => setHistoryFilters({ ...historyFilters, lote: event.target.value })} placeholder="Buscar lote" /></label>
          <button type="button" className="secondary-button" onClick={() => setHistoryFilters({ reglaSanitariaId: '', tipo: '', tipoFuncional: '', lote: '', fechaRealizadaDesde: '', fechaRealizadaHasta: '' })}>Limpiar</button>
        </form>
        <div className="table-wrap">
          <table className="users-table">
            <thead><tr><th>Fecha realización</th><th>Regla sanitaria</th><th>Tipo</th><th>Tipo funcional</th><th>Lotes</th><th>Animales</th><th>Usuario</th><th>Observaciones</th><th>Acciones</th></tr></thead>
            <tbody>
              {aplicaciones.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.fechaRealizacion)}</td>
                  <td>{item.reglaNombre}</td>
                  <td>{tipoLabels[item.tipo]}</td>
                  <td>{item.tipoFuncionalLabel}</td>
                  <td>{Array.from(new Set(item.animales.map((animal) => animal.loteSnapshot))).join(', ') || '-'}</td>
                  <td>{item.cantidadAnimales} animales</td>
                  <td>{item.usuario?.nombre ?? '-'}</td>
                  <td>{item.observaciones ?? '-'}</td>
                  <td><div className="table-actions"><button type="button" onClick={() => setSelectedApplication(item)} aria-label="Ver detalle"><Eye size={16} /></button></div></td>
                </tr>
              ))}
              {aplicaciones.length === 0 && <tr><td colSpan={9}>Sin aplicaciones sanitarias para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPending && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <div className="panel-header"><div><h2>{selectedPending.reglaNombre}</h2><p>{tipoLabels[selectedPending.tipo]} · Fecha máxima: {formatDate(selectedPending.fechaMaxima)}</p></div><button type="button" className="icon-button" onClick={() => setSelectedPending(null)} aria-label="Cerrar"><X size={18} /></button></div>
            <div className="user-form">
              <div className="info-grid">
                <div className="info-item"><span>Tipo</span><strong>{tipoLabels[selectedPending.tipo]}</strong></div>
                <div className="info-item"><span>Tipo funcional</span><strong>{selectedPending.tipoFuncionalLabel}</strong></div>
                <div className="info-item"><span>Estado</span><strong>{estadoLabels[selectedPending.estado]}</strong></div>
                <div className="info-item"><span>Lotes</span><strong>{selectedPending.cantidadLotes}</strong></div>
                <div className="info-item"><span>Animales</span><strong>{selectedPending.cantidadAnimales}</strong></div>
              </div>
              {selectedPending.lotes?.map((lote) => (
                <div key={lote.id} className="form-subsection sanitary-lote-detail">
                  <h3>Lote: {lote.nombre}</h3>
                  <p className="field-help">Animales: {lote.animales.length}</p>
                  {lote.animales.length === 0 ? <p className="table-empty">Sin animales activos.</p> : (
                    <div className="sanitary-animal-grid">
                      {lote.animales.map((animal) => <span key={animal.id}>#{animal.caravana}</span>)}
                    </div>
                  )}
                </div>
              ))}
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => exportPendingPdf(selectedPending)}><Download size={16} />Exportar PDF</button>{canMarkDone && isOpenSanitaryStatus(selectedPending.estado) && <button type="button" className="primary-button" onClick={() => openPerformModal(selectedPending)}><Syringe size={16} />Marcar como realizada</button>}</div>
            </div>
          </section>
        </div>
      )}

      {selectedApplication && (
        <div className="modal-backdrop">
          <section className="modal-panel sanitary-history-modal">
            <div className="panel-header">
              <div>
                <h2>Detalle de aplicación sanitaria</h2>
                <strong className="modal-title-value">{selectedApplication.reglaNombre}</strong>
                <p>{tipoLabels[selectedApplication.tipo]} · Realizada el {formatDate(selectedApplication.fechaRealizacion)} · Tipo funcional: {selectedApplication.tipoFuncionalLabel}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedApplication(null)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="user-form sanitary-history-content">
              <div className="info-grid sanitary-history-summary">
                <div className="info-item"><span>Regla sanitaria</span><strong>{selectedApplication.reglaNombre}</strong></div>
                <div className="info-item"><span>Tipo sanitario</span><strong>{tipoLabels[selectedApplication.tipo]}</strong></div>
                <div className="info-item"><span>Fecha realizada</span><strong>{formatDate(selectedApplication.fechaRealizacion)}</strong></div>
                <div className="info-item"><span>Tipo funcional</span><strong>{selectedApplication.tipoFuncionalLabel}</strong></div>
                <div className="info-item"><span>Lotes procesados</span><strong>{applicationLoteRows(selectedApplication).length}</strong></div>
                <div className="info-item"><span>Animales procesados</span><strong>{selectedApplication.cantidadAnimales}</strong></div>
                <div className="info-item"><span>Usuario</span><strong>{selectedApplication.usuario?.nombre ?? '-'}</strong></div>
                {selectedApplication.observaciones && <div className="info-item sanitary-history-observations"><span>Observaciones</span><strong>{selectedApplication.observaciones}</strong></div>}
              </div>
              <div className="table-wrap sanitary-history-table-wrap">
                <table className="users-table sanitary-history-table">
                  <thead><tr><th>Lote</th><th>Animales</th><th>Caravanas</th></tr></thead>
                  <tbody>
                    {applicationLoteRows(selectedApplication).map(({ lote, caravanas }) => (
                      <tr key={lote}>
                        <td>{lote}</td>
                        <td>{caravanas.length}</td>
                        <td>
                          <div className="sanitary-caravana-list">
                            {caravanas.map((caravana) => <span key={`${lote}-${caravana}`}>#{caravana}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {selectedApplication.animales.length === 0 && <tr><td colSpan={3}>Sin animales registrados para esta aplicación.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {performTarget && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <div className="panel-header"><div><h2>Marcar como realizada</h2><p>{performTarget.reglaNombre} · {performTarget.tipoFuncionalLabel}</p></div><button type="button" className="icon-button" onClick={() => setPerformTarget(null)} aria-label="Cerrar"><X size={18} /></button></div>
            <form className="user-form" onSubmit={handlePerformSubmit}>
              <label><span>Fecha de realización</span><input type="date" value={performValues.fechaRealizacion} onChange={(event) => setPerformValues({ ...performValues, fechaRealizacion: event.target.value })} required /></label>
              <label><span>Observaciones</span><textarea rows={4} value={performValues.observaciones} onChange={(event) => setPerformValues({ ...performValues, observaciones: event.target.value })} /></label>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPerformTarget(null)}>Cancelar</button><button type="submit" className="primary-button" disabled={isSaving}><Syringe size={18} />{isSaving ? 'Guardando...' : 'Guardar aplicación'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
