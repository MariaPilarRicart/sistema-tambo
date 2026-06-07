import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BarChart3, Droplets, Edit2, Milk, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getAnimales } from '../services/animalesService';
import { getLotes } from '../services/lotesService';
import {
  createLoteLeche,
  createProduccion,
  deleteLoteLeche,
  deleteProduccion,
  getLotesLeche,
  getProduccionPorAnimal,
  getProduccionPorLote,
  getProduccionPorLoteLeche,
  getProducciones,
  getResumenProduccion,
  getSiguienteCodigoLoteLeche,
  updateLoteLeche,
} from '../services/produccionService';
import type { Animal, CategoriaAnimal, EstadoReproductivo } from '../types/animales';
import type { AuthUser } from '../types/auth';
import type { Lote } from '../types/lotes';
import type {
  EstadoLoteLeche,
  LoteLeche,
  LoteLecheCreateValues,
  LoteLecheEditValues,
  MotivoDescarteLeche,
  ProduccionAnimal,
  ProduccionFilters,
  ProduccionFormValues,
  ProduccionPorAnimal,
  ProduccionPorLote,
  ProduccionPorLoteLeche,
  ProduccionResumen,
  TurnoOrdene,
} from '../types/produccion';

type StatsType = 'animal' | 'lote' | 'loteLeche';

function localDateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function dateInputValue(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const emptyForm: ProduccionFormValues = {
  loteId: '',
  animalId: '',
  loteLecheId: '',
  fechaHora: localDateTimeValue(),
  turno: 'MANANA',
  litrosProducidos: '',
  litrosDescartados: '0',
  motivoDescarte: '',
  observacionDescarte: '',
};

const emptyLoteLecheCreateForm: LoteLecheCreateValues = {
  codigo: '',
  descripcion: '',
};

const emptyFilters: ProduccionFilters = {
  fechaDesde: localDateValue(),
  fechaHasta: localDateValue(),
  animalId: '',
  loteId: '',
  loteLecheId: '',
  turno: '',
};

const turnoLabels: Record<TurnoOrdene, string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
};

const motivoLabels: Record<MotivoDescarteLeche, string> = {
  MASTITIS: 'Mastitis',
  ANTIBIOTICO: 'Antibiótico',
  ANTIBIOTICOS: 'Antibióticos',
  CALOSTRO: 'Calostro',
  MALA_CALIDAD: 'Mala calidad',
  CONTAMINACION: 'Contaminación',
  PROBLEMA_SANITARIO: 'Problema sanitario',
  TEMPERATURA_FUERA_DE_RANGO: 'Temperatura fuera de rango',
  OTRO: 'Otro',
};

const loteDiscardMotives: MotivoDescarteLeche[] = [
  'MALA_CALIDAD',
  'CONTAMINACION',
  'ANTIBIOTICOS',
  'PROBLEMA_SANITARIO',
  'TEMPERATURA_FUERA_DE_RANGO',
  'OTRO',
];

const estadoLoteLecheLabels: Record<EstadoLoteLeche, string> = {
  DISPONIBLE: 'Disponible',
  VENDIDO: 'Vendido',
  VENCIDO: 'Vencido',
};

const categoriaLabels: Record<CategoriaAnimal, string> = {
  GUACHERA: 'Guachera',
  ESCUELITA: 'Escuelita',
  TERNERA: 'Ternera',
  VAQUILLONA: 'Vaquillona',
  VACA_PRODUCCION: 'Vaca en producción',
  VACA_SECA: 'Vaca seca',
  PREPARTO: 'Preparto',
  TORO: 'Toro',
  BAJA: 'Baja',
};

const estadoReproductivoLabels: Record<EstadoReproductivo, string> = {
  NO_APLICA: 'No aplica',
  VACIA: 'Vacía',
  INSEMINADA: 'Inseminada',
  PRENADA: 'Preñada',
  SECA: 'Seca',
  RECUPERACION: 'Recuperación',
};

const statsTypeLabels: Record<StatsType, string> = {
  animal: 'Por animal',
  lote: 'Por lote de animales',
  loteLeche: 'Por lote de producción',
};

interface ProduccionViewProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-AR');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR');
}

function formatLiters(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} l`;
}

function formatNumber(value: number | string | null | undefined, suffix = '') {
  const number = Number(value ?? 0);
  return number > 0 ? `${number.toLocaleString('es-AR', { maximumFractionDigits: 2 })}${suffix}` : '-';
}

function netLiters(registro: ProduccionAnimal) {
  return Number(registro.litrosProducidos) - Number(registro.litrosDescartados);
}

function animalLabel(animal: Pick<Animal, 'caravana' | 'categoriaAnimal' | 'estadoReproductivo'>) {
  return `Caravana ${animal.caravana} - ${categoriaLabels[animal.categoriaAnimal]} - ${estadoReproductivoLabels[animal.estadoReproductivo]}`;
}

function statsAnimalLabel(animal: Pick<Animal, 'caravana' | 'nombre'>) {
  return `#${animal.caravana}${animal.nombre ? ` ${animal.nombre}` : ''}`;
}

function statsLoteLabel(lote: Pick<Lote, 'nombre' | 'descripcion'>) {
  return lote.descripcion ? `${lote.nombre} - ${lote.descripcion}` : lote.nombre;
}

function statsLoteLecheLabel(loteLeche: Pick<LoteLeche, 'codigo' | 'descripcion'>) {
  return loteLeche.descripcion ? `${loteLeche.codigo} - ${loteLeche.descripcion}` : loteLeche.codigo;
}

function loteLecheToEditValues(loteLeche: LoteLeche): LoteLecheEditValues {
  return {
    descripcion: loteLeche.descripcion ?? '',
    fechaVencimiento: dateInputValue(loteLeche.fechaVencimiento),
    estado: loteLeche.estado,
    grasa: loteLeche.grasa?.toString() ?? '',
    proteina: loteLeche.proteina?.toString() ?? '',
    recuentoBacteriano: loteLeche.recuentoBacteriano?.toString() ?? '',
    recuentoCelulasSomaticas: loteLeche.recuentoCelulasSomaticas?.toString() ?? '',
    temperatura: loteLeche.temperatura?.toString() ?? '',
    observacionesCalidad: loteLeche.observacionesCalidad ?? '',
    litrosDescartados: loteLeche.litrosDescartados?.toString() ?? '0',
    motivoDescarte: loteLeche.motivoDescarte ?? '',
    observacionDescarte: loteLeche.observacionDescarte ?? '',
  };
}

export function ProduccionView({ authToken, currentUser, onUnauthorized }: ProduccionViewProps) {
  const [registros, setRegistros] = useState<ProduccionAnimal[]>([]);
  const [resumen, setResumen] = useState<ProduccionResumen | null>(null);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [lotesLeche, setLotesLeche] = useState<LoteLeche[]>([]);
  const [form, setForm] = useState<ProduccionFormValues>(emptyForm);
  const [loteLecheForm, setLoteLecheForm] = useState<LoteLecheCreateValues>(emptyLoteLecheCreateForm);
  const [editingLoteLeche, setEditingLoteLeche] = useState<LoteLeche | null>(null);
  const [loteLecheEditForm, setLoteLecheEditForm] = useState<LoteLecheEditValues | null>(null);
  const [showLoteLecheModal, setShowLoteLecheModal] = useState(false);
  const [showOrdeneModal, setShowOrdeneModal] = useState(false);
  const [filters, setFilters] = useState<ProduccionFilters>(emptyFilters);
  const [statsType, setStatsType] = useState<StatsType>('animal');
  const [statsSearch, setStatsSearch] = useState('');
  const [statsAnimalId, setStatsAnimalId] = useState('');
  const [statsLoteId, setStatsLoteId] = useState('');
  const [statsLoteLecheId, setStatsLoteLecheId] = useState('');
  const [animalStats, setAnimalStats] = useState<ProduccionPorAnimal | null>(null);
  const [loteStats, setLoteStats] = useState<ProduccionPorLote | null>(null);
  const [loteLecheStats, setLoteLecheStats] = useState<ProduccionPorLoteLeche | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const hasDiscard = Number(form.litrosDescartados || 0) > 0;
  const editHasDiscard = Number(loteLecheEditForm?.litrosDescartados || 0) > 0;
  const editLitrosTotales = Number(editingLoteLeche?.litrosTotales ?? 0);
  const editLitrosDescartados = Number(loteLecheEditForm?.litrosDescartados || 0);
  const availableLotesLeche = useMemo(() => lotesLeche.filter((lote) => lote.estado === 'DISPONIBLE'), [lotesLeche]);
  const selectedLoteAnimals = useMemo(
    () =>
      animales.filter(
        (animal) =>
          animal.activo && animal.estadoAnimal === 'ACTIVO' && animal.categoriaAnimal === 'VACA_PRODUCCION' && String(animal.loteId) === form.loteId,
      ),
    [animales, form.loteId],
  );
  const statsQuery = statsSearch.trim().toLocaleLowerCase('es-AR');
  const filteredStatsAnimals = useMemo(
    () =>
      statsQuery
        ? animales.filter((animal) => `${animal.caravana} ${animal.nombre ?? ''}`.toLocaleLowerCase('es-AR').includes(statsQuery)).slice(0, 8)
        : [],
    [animales, statsQuery],
  );
  const filteredStatsLotes = useMemo(
    () =>
      statsQuery
        ? lotes.filter((lote) => `${lote.nombre} ${lote.descripcion ?? ''}`.toLocaleLowerCase('es-AR').includes(statsQuery)).slice(0, 8)
        : [],
    [lotes, statsQuery],
  );
  const filteredStatsLotesLeche = useMemo(
    () =>
      statsQuery
        ? lotesLeche.filter((lote) => `${lote.codigo} ${lote.descripcion ?? ''}`.toLocaleLowerCase('es-AR').includes(statsQuery)).slice(0, 8)
        : [],
    [lotesLeche, statsQuery],
  );

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof ApiError && requestError.statusCode === 401) {
      onUnauthorized();
      return;
    }
    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  async function refreshNextCode() {
    if (!authToken || !isAdmin) return;
    try {
      const codigo = await getSiguienteCodigoLoteLeche(authToken);
      setLoteLecheForm((current) => ({ ...current, codigo }));
    } catch (codeError) {
      handleRequestError(codeError, 'No se pudo sugerir el código del lote.');
    }
  }

  async function loadData(nextFilters = filters) {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      const [nextRegistros, nextResumen, nextAnimales, nextLotes, nextLotesLeche] = await Promise.all([
        getProducciones(authToken, nextFilters),
        getResumenProduccion(authToken),
        getAnimales(authToken, { caravana: '', categoriaAnimal: 'VACA_PRODUCCION', loteId: '', estadoReproductivo: '', estadoAnimal: '', activo: 'true' }),
        getLotes(authToken),
        getLotesLeche(authToken),
      ]);
      setRegistros(nextRegistros);
      setResumen(nextResumen);
      setAnimales(nextAnimales);
      setLotes(nextLotes);
      setLotesLeche(nextLotesLeche);
    } catch (loadError) {
      handleRequestError(loadError, 'No se pudo cargar producción.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    void refreshNextCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, isAdmin]);

  function updateForm(next: Partial<ProduccionFormValues>) {
    setForm((current) => ({ ...current, ...next }));
  }

  async function handleCreateLoteLeche(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await createLoteLeche(authToken, loteLecheForm);
      setLoteLecheForm(emptyLoteLecheCreateForm);
      setShowLoteLecheModal(false);
      setSuccess('Lote de leche creado correctamente.');
      await loadData();
      await refreshNextCode();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo crear el lote de leche.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateLoteLeche(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    if (!editingLoteLeche || !loteLecheEditForm) return;
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateLoteLeche(authToken, editingLoteLeche.id, loteLecheEditForm);
      setEditingLoteLeche(null);
      setLoteLecheEditForm(null);
      setSuccess(`Lote ${updated.codigo} actualizado correctamente.`);
      await loadData();
      if (statsLoteLecheId === String(updated.id)) await loadLoteLecheStats(String(updated.id));
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo actualizar el lote de leche.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await createProduccion(authToken, form);
      setForm({ ...emptyForm, fechaHora: localDateTimeValue(), loteId: form.loteId, loteLecheId: form.loteLecheId });
      setShowOrdeneModal(false);
      setSuccess('Ordeñe registrado correctamente.');
      await loadData();
      await refreshActiveStats();
    } catch (saveError) {
      handleRequestError(saveError, 'No se pudo registrar el ordeñe.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadData(filters);
  }

  async function handleDeleteRegistro(registro: ProduccionAnimal) {
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await deleteProduccion(authToken, registro.id);
      setSuccess('Registro eliminado correctamente.');
      await loadData();
    } catch (deleteError) {
      handleRequestError(deleteError, 'No se pudo eliminar el registro.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLoteLeche(loteLeche: LoteLeche) {
    if (!authToken) return onUnauthorized();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await deleteLoteLeche(authToken, loteLeche.id);
      setSuccess('Lote de leche eliminado correctamente.');
      await loadData();
      await refreshNextCode();
    } catch (deleteError) {
      handleRequestError(deleteError, 'No se pudo eliminar el lote de leche.');
    } finally {
      setIsSaving(false);
    }
  }

  async function loadAnimalStats(animalId: string) {
    setStatsAnimalId(animalId);
    setAnimalStats(null);
    if (!authToken || !animalId) return;
    try {
      setAnimalStats(await getProduccionPorAnimal(authToken, Number(animalId)));
    } catch (statsError) {
      handleRequestError(statsError, 'No se pudo cargar la estadística del animal.');
    }
  }

  async function loadLoteStats(loteId: string) {
    setStatsLoteId(loteId);
    setLoteStats(null);
    if (!authToken || !loteId) return;
    try {
      setLoteStats(await getProduccionPorLote(authToken, Number(loteId)));
    } catch (statsError) {
      handleRequestError(statsError, 'No se pudo cargar la estadística del lote.');
    }
  }

  async function loadLoteLecheStats(loteLecheId: string) {
    setStatsLoteLecheId(loteLecheId);
    setLoteLecheStats(null);
    if (!authToken || !loteLecheId) return;
    try {
      setLoteLecheStats(await getProduccionPorLoteLeche(authToken, Number(loteLecheId)));
    } catch (statsError) {
      handleRequestError(statsError, 'No se pudo cargar la estadística del lote de leche.');
    }
  }

  async function refreshActiveStats() {
    if (statsType === 'animal' && statsAnimalId) await loadAnimalStats(statsAnimalId);
    if (statsType === 'lote' && statsLoteId) await loadLoteStats(statsLoteId);
    if (statsType === 'loteLeche' && statsLoteLecheId) await loadLoteLecheStats(statsLoteLecheId);
  }

  function openLoteLecheModal() {
    setShowLoteLecheModal(true);
    setError('');
    setSuccess('');
    void refreshNextCode();
  }

  function closeLoteLecheModal() {
    setShowLoteLecheModal(false);
    setLoteLecheForm(emptyLoteLecheCreateForm);
    void refreshNextCode();
  }

  function openOrdeneModal() {
    setShowOrdeneModal(true);
    setError('');
    setSuccess('');
  }

  function closeOrdeneModal() {
    setShowOrdeneModal(false);
    setForm({ ...emptyForm, fechaHora: localDateTimeValue() });
  }

  function changeStatsType(nextType: StatsType) {
    setStatsType(nextType);
    setStatsSearch('');
    setStatsAnimalId('');
    setStatsLoteId('');
    setStatsLoteLecheId('');
    setAnimalStats(null);
    setLoteStats(null);
    setLoteLecheStats(null);
  }

  function resetActiveStatsSearch(value: string) {
    setStatsSearch(value);
    if (statsType === 'animal') {
      setStatsAnimalId('');
      setAnimalStats(null);
    }
    if (statsType === 'lote') {
      setStatsLoteId('');
      setLoteStats(null);
    }
    if (statsType === 'loteLeche') {
      setStatsLoteLecheId('');
      setLoteLecheStats(null);
    }
  }

  function selectStatsAnimal(animal: Animal) {
    setStatsSearch(statsAnimalLabel(animal));
    void loadAnimalStats(String(animal.id));
  }

  function selectStatsLote(lote: Lote) {
    setStatsSearch(statsLoteLabel(lote));
    void loadLoteStats(String(lote.id));
  }

  function selectStatsLoteLeche(loteLeche: LoteLeche) {
    setStatsSearch(statsLoteLecheLabel(loteLeche));
    void loadLoteLecheStats(String(loteLeche.id));
  }

  function openEditLoteLeche(loteLeche: LoteLeche) {
    setEditingLoteLeche(loteLeche);
    setLoteLecheEditForm(loteLecheToEditValues(loteLeche));
    setError('');
    setSuccess('');
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Producción</h2>
          <p>Registro de ordeñes por animal y trazabilidad por lote de leche.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar producción">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="operative-summary-grid production-summary-grid">
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-emerald"><Milk size={20} /></div>
          <p className="metric-title">Litros netos del día</p>
          <strong className="metric-value">{formatLiters(resumen?.totalLitrosNetos)}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-amber"><Droplets size={20} /></div>
          <p className="metric-title">Descartados del día</p>
          <strong className="metric-value">{formatLiters(resumen?.totalLitrosDescartados)}</strong>
        </article>
        <article className="metric-card operative-card">
          <div className="metric-icon metric-icon-blue"><BarChart3 size={20} /></div>
          <p className="metric-title">Promedio por animal</p>
          <strong className="metric-value">{formatLiters(resumen?.promedioPorAnimal)}</strong>
        </article>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Lotes de leche</h2>
            <p>Alta simple y administración posterior de calidad, estado y descarte.</p>
          </div>
          {isAdmin && <button type="button" className="primary-button" onClick={openLoteLecheModal}><Plus size={16} />Nuevo lote</button>}
        </div>
        <div className="table-wrap feed-table-wrap">
          <table className="users-table production-history-table">
            <thead><tr><th>Código</th><th>Estado</th><th>Fechas</th><th>Disponibilidad</th><th>Calidad</th><th>Acciones</th></tr></thead>
            <tbody>
              {lotesLeche.map((loteLeche) => (
                <tr key={loteLeche.id}>
                  <td><strong>{loteLeche.codigo}</strong><span>{loteLeche.descripcion || '-'}</span></td>
                  <td><span className={`status-pill ${loteLeche.estado === 'DISPONIBLE' ? 'status-active' : 'status-inactive'}`}>{estadoLoteLecheLabels[loteLeche.estado]}</span></td>
                  <td><strong>{formatDate(loteLeche.fechaProduccion)}</strong><span>Vence {formatDate(loteLeche.fechaVencimiento)}</span></td>
                  <td><strong>{formatLiters(loteLeche.litrosDisponibles ?? loteLeche.litrosNetos)}</strong><span>Neto {formatLiters(loteLeche.litrosNetos)} / Vendido {formatLiters(loteLeche.litrosVendidos ?? 0)}</span></td>
                  <td><strong>Prot. {formatNumber(loteLeche.proteina, '%')}</strong><span>RB {formatNumber(loteLeche.recuentoBacteriano)} / Temp. {formatNumber(loteLeche.temperatura, ' °C')}</span></td>
                  <td>
                    {isAdmin && (
                      <div className="table-actions">
                        <button type="button" onClick={() => openEditLoteLeche(loteLeche)} aria-label="Editar lote de leche"><Edit2 size={16} /></button>
                        <button type="button" onClick={() => void handleDeleteLoteLeche(loteLeche)} aria-label="Eliminar lote de leche"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {lotesLeche.length === 0 && <tr><td colSpan={6}>Sin lotes de leche cargados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div><h2>Historial</h2><p>Registros individuales de producción.</p></div>
          <button type="button" className="primary-button" onClick={openOrdeneModal}><Plus size={16} />Nuevo ordeñe</button>
        </div>
        <form className="filters-form events-filters production-filters" onSubmit={handleApplyFilters}>
          <label className="filter-field"><span>Fecha desde</span><input type="date" value={filters.fechaDesde} onChange={(event) => setFilters({ ...filters, fechaDesde: event.target.value })} /></label>
          <label className="filter-field"><span>Fecha hasta</span><input type="date" value={filters.fechaHasta} onChange={(event) => setFilters({ ...filters, fechaHasta: event.target.value })} /></label>
          <label className="filter-field"><span>Lote</span><select value={filters.loteId} onChange={(event) => setFilters({ ...filters, loteId: event.target.value, animalId: '' })}><option value="">Todos</option>{lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}</select></label>
          <label className="filter-field"><span>Animal</span><select value={filters.animalId} onChange={(event) => setFilters({ ...filters, animalId: event.target.value })}><option value="">Todos</option>{animales.filter((animal) => !filters.loteId || String(animal.loteId) === filters.loteId).map((animal) => <option key={animal.id} value={animal.id}>{animalLabel(animal)}</option>)}</select></label>
          <label className="filter-field"><span>Lote de leche</span><select value={filters.loteLecheId} onChange={(event) => setFilters({ ...filters, loteLecheId: event.target.value })}><option value="">Todos</option>{lotesLeche.map((lote) => <option key={lote.id} value={lote.id}>{lote.codigo}</option>)}</select></label>
          <label className="filter-field"><span>Turno</span><select value={filters.turno} onChange={(event) => setFilters({ ...filters, turno: event.target.value })}><option value="">Todos</option>{Object.entries(turnoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button type="submit" className="secondary-button">Filtrar</button>
        </form>
        {isLoading ? <p className="table-empty">Cargando producción...</p> : (
          <div className="table-wrap">
            <table className="users-table production-history-table">
              <thead><tr><th>Fecha y hora</th><th>Caravana</th><th>Lote</th><th>Lote de leche</th><th>Turno</th><th>Producidos</th><th>Descartados</th><th>Netos</th><th>Motivo</th><th>Usuario</th><th>Acciones</th></tr></thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td>{formatDateTime(registro.fechaHora)}</td>
                    <td><strong>{registro.animal.caravana}</strong><span>{categoriaLabels[registro.animal.categoriaAnimal]}</span></td>
                    <td>{registro.animal.lote.nombre}</td>
                    <td>{registro.loteLeche.codigo}</td>
                    <td>{turnoLabels[registro.turno]}</td>
                    <td>{formatLiters(registro.litrosProducidos)}</td>
                    <td>{formatLiters(registro.litrosDescartados)}</td>
                    <td><strong>{formatLiters(netLiters(registro))}</strong></td>
                    <td>{registro.motivoDescarte ? motivoLabels[registro.motivoDescarte] : '-'}</td>
                    <td>{registro.usuario?.nombre ?? '-'}</td>
                    <td>{isAdmin && <button type="button" className="icon-button" onClick={() => void handleDeleteRegistro(registro)} aria-label="Eliminar registro"><Trash2 size={16} /></button>}</td>
                  </tr>
                ))}
                {registros.length === 0 && <tr><td colSpan={11}>Sin registros de producción.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel production-stats-panel">
        <div className="panel-header"><div><h2>Estadísticas</h2><p>Elegí un tipo y buscá por coincidencia de caracteres.</p></div></div>
        <div className="production-stats-controls">
          <label className="filter-field">
            <span>Tipo de estadística</span>
            <select value={statsType} onChange={(event) => changeStatsType(event.target.value as StatsType)}>
              {Object.entries(statsTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="filter-field production-stats-search">
            <span>Buscar</span>
            <input
              value={statsSearch}
              onChange={(event) => resetActiveStatsSearch(event.target.value)}
              placeholder={statsType === 'animal' ? 'Buscar por caravana o nombre...' : statsType === 'lote' ? 'Buscar por nombre o descripción...' : 'Buscar por código o descripción...'}
              autoComplete="off"
            />
            {statsQuery && statsType === 'animal' && !statsAnimalId && (
              <div className="client-results production-stats-results">
                {filteredStatsAnimals.map((animal) => <button type="button" key={animal.id} onClick={() => selectStatsAnimal(animal)}>{statsAnimalLabel(animal)}</button>)}
                {filteredStatsAnimals.length === 0 && <p>No se encontraron animales</p>}
              </div>
            )}
            {statsQuery && statsType === 'lote' && !statsLoteId && (
              <div className="client-results production-stats-results">
                {filteredStatsLotes.map((lote) => <button type="button" key={lote.id} onClick={() => selectStatsLote(lote)}>{statsLoteLabel(lote)}</button>)}
                {filteredStatsLotes.length === 0 && <p>No se encontraron lotes</p>}
              </div>
            )}
            {statsQuery && statsType === 'loteLeche' && !statsLoteLecheId && (
              <div className="client-results production-stats-results">
                {filteredStatsLotesLeche.map((lote) => <button type="button" key={lote.id} onClick={() => selectStatsLoteLeche(lote)}>{statsLoteLecheLabel(lote)}</button>)}
                {filteredStatsLotesLeche.length === 0 && <p>No se encontraron lotes de producción</p>}
              </div>
            )}
          </label>
        </div>

        {statsType === 'animal' && (animalStats ? <div className="dashboard-kpi-grid production-stats-grid">
          <article className="dashboard-kpi-card dashboard-kpi-emerald"><strong>Litros totales</strong><h3>{formatLiters(animalStats.litrosTotalesProducidos)}</h3></article>
          <article className="dashboard-kpi-card dashboard-kpi-amber"><strong>Descartados</strong><h3>{formatLiters(animalStats.litrosDescartados)}</h3></article>
          <article className="dashboard-kpi-card dashboard-kpi-blue"><strong>Litros netos</strong><h3>{formatLiters(animalStats.litrosNetos)}</h3></article>
          <article className="dashboard-kpi-card dashboard-kpi-indigo"><strong>Ordeñes</strong><h3>{animalStats.cantidadOrdenes}</h3></article>
          <article className="dashboard-kpi-card dashboard-kpi-pink"><strong>Grasa promedio</strong><h3>{formatNumber(animalStats.grasaPromedio, '%')}</h3></article>
          <article className="dashboard-kpi-card dashboard-kpi-pink"><strong>Proteína promedio</strong><h3>{formatNumber(animalStats.proteinaPromedio, '%')}</h3></article>
          <article className="dashboard-kpi-card dashboard-kpi-rose"><strong>RB promedio</strong><h3>{formatNumber(animalStats.recuentoBacterianoPromedio)}</h3></article>
          <article className="dashboard-kpi-card dashboard-kpi-rose"><strong>Temp. promedio</strong><h3>{formatNumber(animalStats.temperaturaPromedio, ' °C')}</h3></article>
        </div> : <p className="table-empty">Seleccioná un animal para ver estadísticas.</p>)}

        {statsType === 'lote' && (loteStats ? <>
          <div className="dashboard-kpi-grid production-stats-grid">
            <article className="dashboard-kpi-card dashboard-kpi-emerald"><strong>Litros totales</strong><h3>{formatLiters(loteStats.litrosTotalesProducidos)}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-amber"><strong>Descartados</strong><h3>{formatLiters(loteStats.litrosDescartados)}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-blue"><strong>Litros netos</strong><h3>{formatLiters(loteStats.litrosNetos)}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-indigo"><strong>Animales</strong><h3>{loteStats.cantidadAnimalesConProduccion}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-pink"><strong>Proteína promedio</strong><h3>{formatNumber(loteStats.proteinaPromedio, '%')}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-rose"><strong>RCS promedio</strong><h3>{formatNumber(loteStats.recuentoCelulasSomaticasPromedio)}</h3></article>
          </div>
          <div className="compact-bars">{loteStats.rankingAnimales.slice(0, 8).map((item) => <div className="compact-bar-row" key={item.animal.id}><div className="compact-bar-label"><strong>{item.animal.caravana}</strong><span>{formatLiters(item.litrosNetos)}</span></div><div className="compact-bar-track"><span style={{ width: `${Math.min((item.litrosNetos / Math.max(loteStats.rankingAnimales[0]?.litrosNetos ?? 1, 1)) * 100, 100)}%` }} /></div></div>)}</div>
        </> : <p className="table-empty">Seleccioná un lote de animales para ver estadísticas.</p>)}

        {statsType === 'loteLeche' && (loteLecheStats ? <>
          <div className="dashboard-kpi-grid production-stats-grid">
            <article className="dashboard-kpi-card dashboard-kpi-emerald"><strong>Total</strong><h3>{formatLiters(loteLecheStats.litrosTotales)}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-amber"><strong>Descarte</strong><h3>{formatLiters(loteLecheStats.litrosDescartados)}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-blue"><strong>Neto</strong><h3>{formatLiters(loteLecheStats.litrosNetos)}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-indigo"><strong>Estado</strong><h3>{estadoLoteLecheLabels[loteLecheStats.loteLeche.estado]}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-pink"><strong>Proteína</strong><h3>{formatNumber(loteLecheStats.calidad.proteina, '%')}</h3></article>
            <article className="dashboard-kpi-card dashboard-kpi-rose"><strong>RB</strong><h3>{formatNumber(loteLecheStats.calidad.recuentoBacteriano)}</h3></article>
          </div>
          <div className="table-wrap feed-table-wrap"><table className="users-table"><thead><tr><th>Animal</th><th>Lote</th><th>Total</th><th>Descartado</th><th>Neto aportado</th></tr></thead><tbody>{loteLecheStats.litrosPorAnimal.map((item) => <tr key={item.animal.id}><td><strong>{item.animal.caravana}</strong><span>{categoriaLabels[item.animal.categoriaAnimal]}</span></td><td>{item.animal.lote.nombre}</td><td>{formatLiters(item.litrosTotales)}</td><td>{formatLiters(item.litrosDescartados)}</td><td>{formatLiters(item.litrosNetos)}</td></tr>)}</tbody></table></div>
        </> : <p className="table-empty">Seleccioná un lote de producción para ver estadísticas.</p>)}
      </section>

      {showLoteLecheModal && isAdmin && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Nuevo lote de leche</h2>
                <p>Alta simple para registrar producción disponible.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeLoteLecheModal} aria-label="Cerrar nuevo lote de leche"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleCreateLoteLeche}>
              <label>
                <span>Código</span>
                <input value={loteLecheForm.codigo} onChange={(event) => setLoteLecheForm({ ...loteLecheForm, codigo: event.target.value })} required />
              </label>
              <label>
                <span>Descripción</span>
                <input value={loteLecheForm.descripcion} onChange={(event) => setLoteLecheForm({ ...loteLecheForm, descripcion: event.target.value })} />
              </label>
              <div className="modal-actions production-wide-field">
                <button type="button" className="secondary-button" onClick={closeLoteLecheModal} disabled={isSaving}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Save size={18} />Crear lote de leche</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showOrdeneModal && (
        <div className="modal-backdrop">
          <section className="panel modal-panel animal-form-modal production-ordene-modal">
            <div className="panel-header">
              <div>
                <h2>Nuevo ordeñe</h2>
                <p>Primero seleccioná el lote del sistema y luego el animal activo.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeOrdeneModal} aria-label="Cerrar nuevo ordeñe"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleSubmit}>
              <label><span>Lote del sistema</span><select value={form.loteId} onChange={(event) => updateForm({ loteId: event.target.value, animalId: '' })} required><option value="">Seleccionar lote</option>{lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}</select></label>
              <label><span>Animal filtrado por lote</span><select value={form.animalId} onChange={(event) => updateForm({ animalId: event.target.value })} required disabled={!form.loteId}><option value="">Seleccionar animal</option>{selectedLoteAnimals.map((animal) => <option key={animal.id} value={animal.id}>{animalLabel(animal)}</option>)}</select></label>
              <label><span>Lote de leche destino</span><select value={form.loteLecheId} onChange={(event) => updateForm({ loteLecheId: event.target.value })} required><option value="">Seleccionar lote de leche</option>{availableLotesLeche.map((lote) => <option key={lote.id} value={lote.id}>{lote.codigo} - {estadoLoteLecheLabels[lote.estado]}</option>)}</select></label>
              <label><span>Fecha y hora</span><input type="datetime-local" value={form.fechaHora} onChange={(event) => updateForm({ fechaHora: event.target.value })} required /></label>
              <label><span>Turno</span><select value={form.turno} onChange={(event) => updateForm({ turno: event.target.value as TurnoOrdene })}>{Object.entries(turnoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Litros producidos</span><input type="number" min="0" step="0.01" value={form.litrosProducidos} onChange={(event) => updateForm({ litrosProducidos: event.target.value })} required /></label>
              <label><span>Litros descartados</span><input type="number" min="0" step="0.01" value={form.litrosDescartados} onChange={(event) => updateForm({ litrosDescartados: event.target.value })} required /></label>
              {hasDiscard && <label><span>Motivo de descarte</span><select value={form.motivoDescarte} onChange={(event) => updateForm({ motivoDescarte: event.target.value as ProduccionFormValues['motivoDescarte'] })} required><option value="">Seleccionar motivo</option>{Object.entries(motivoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
              <label className="production-wide-field"><span>Observación de descarte</span><textarea rows={2} value={form.observacionDescarte} onChange={(event) => updateForm({ observacionDescarte: event.target.value })} /></label>
              <div className="modal-actions production-wide-field">
                <button type="button" className="secondary-button" onClick={closeOrdeneModal} disabled={isSaving}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Save size={18} />Guardar ordeñe</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editingLoteLeche && loteLecheEditForm && (
        <div className="modal-backdrop">
          <div className="modal-panel animal-form-modal">
            <div className="panel-header">
              <div>
                <h2>Editar {editingLoteLeche.codigo}</h2>
                <p>Total: {formatLiters(editLitrosTotales)} / Descarte: {formatLiters(editLitrosDescartados)} / Neto: {formatLiters(editLitrosTotales - editLitrosDescartados)}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setEditingLoteLeche(null)} aria-label="Cerrar edición de lote de leche"><X size={18} /></button>
            </div>
            <form className="user-form animal-modal-form" onSubmit={handleUpdateLoteLeche}>
              <label className="production-wide-field"><span>Descripción</span><input value={loteLecheEditForm.descripcion} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, descripcion: event.target.value })} /></label>
              <label><span>Fecha vencimiento</span><input type="date" value={loteLecheEditForm.fechaVencimiento} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, fechaVencimiento: event.target.value })} required /></label>
              <label><span>Estado</span><select value={loteLecheEditForm.estado} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, estado: event.target.value as EstadoLoteLeche })}>{Object.entries(estadoLoteLecheLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Grasa</span><input type="number" min="0" step="0.01" value={loteLecheEditForm.grasa} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, grasa: event.target.value })} /></label>
              <label><span>Proteína</span><input type="number" min="0" step="0.01" value={loteLecheEditForm.proteina} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, proteina: event.target.value })} /></label>
              <label><span>Temperatura</span><input type="number" min="0" step="0.1" value={loteLecheEditForm.temperatura} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, temperatura: event.target.value })} /></label>
              <label><span>Recuento bacteriano</span><input type="number" min="0" step="1" value={loteLecheEditForm.recuentoBacteriano} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, recuentoBacteriano: event.target.value })} /></label>
              <label><span>Células somáticas</span><input type="number" min="0" step="1" value={loteLecheEditForm.recuentoCelulasSomaticas} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, recuentoCelulasSomaticas: event.target.value })} /></label>
              <label><span>Litros descartados</span><input type="number" min="0" max={editLitrosTotales} step="0.01" value={loteLecheEditForm.litrosDescartados} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, litrosDescartados: event.target.value })} required /></label>
              {editHasDiscard && <label><span>Motivo de descarte</span><select value={loteLecheEditForm.motivoDescarte} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, motivoDescarte: event.target.value as LoteLecheEditValues['motivoDescarte'] })} required><option value="">Seleccionar motivo</option>{loteDiscardMotives.map((value) => <option key={value} value={value}>{motivoLabels[value]}</option>)}</select></label>}
              <label className="production-wide-field"><span>Observaciones de calidad</span><textarea rows={2} value={loteLecheEditForm.observacionesCalidad} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, observacionesCalidad: event.target.value })} /></label>
              <label className="production-wide-field"><span>Observación de descarte</span><textarea rows={2} value={loteLecheEditForm.observacionDescarte} onChange={(event) => setLoteLecheEditForm({ ...loteLecheEditForm, observacionDescarte: event.target.value })} /></label>
              <div className="modal-actions production-wide-field">
                <button type="button" className="secondary-button" onClick={() => setEditingLoteLeche(null)}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={isSaving}><Save size={18} />Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
