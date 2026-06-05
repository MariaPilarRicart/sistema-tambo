import { FormEvent, useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getAnimales } from '../services/animalesService';
import { getEventos } from '../services/eventosService';
import type { Animal } from '../types/animales';
import type { Evento, EventoFilters, TipoEvento } from '../types/eventos';

const tipoEventoOptions: TipoEvento[] = [
  'CELO',
  'INSEMINACION',
  'TACTO',
  'SECADO',
  'PARTO',
  'ABORTO',
  'CLINICO',
  'VACUNACION',
  'CAMBIO_LOTE',
  'VENTA',
  'MUERTE',
];

const emptyFilters: EventoFilters = {
  tipo: '',
  animalId: '',
  fechaDesde: '',
  fechaHasta: '',
};

interface EventsPageProps {
  authToken: string | null;
  onUnauthorized: () => void;
}

export function EventsPage({ authToken, onUnauthorized }: EventsPageProps) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [filters, setFilters] = useState<EventoFilters>(emptyFilters);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function loadData(nextFilters = filters) {
    if (!authToken) return;
    setIsLoading(true);
    setError('');

    try {
      const [nextEventos, nextAnimales] = await Promise.all([
        getEventos(authToken, nextFilters),
        getAnimales(authToken, { caravana: '', categoriaAnimal: '', loteId: '', estadoReproductivo: '', estadoAnimal: '', activo: '' }),
      ]);
      setEventos(nextEventos);
      setAnimales(nextAnimales);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onUnauthorized();
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los eventos.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadData(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    void loadData(emptyFilters);
  }

  return (
    <div className="settings-page">
      <section className="settings-header">
        <div>
          <h2>Eventos</h2>
          <p>Historial cronologico de eventos del rodeo.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadData()} aria-label="Actualizar eventos">
          <RefreshCcw size={18} />
        </button>
      </section>

      <section className="panel herd-filters">
        <form className="filters-form events-filters" onSubmit={applyFilters}>
          <select value={filters.tipo} onChange={(event) => setFilters({ ...filters, tipo: event.target.value })}>
            <option value="">Tipo de evento</option>
            {tipoEventoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={filters.animalId} onChange={(event) => setFilters({ ...filters, animalId: event.target.value })}>
            <option value="">Todos los animales</option>
            {animales.map((animal) => <option key={animal.id} value={animal.id}>#{animal.caravana}</option>)}
          </select>
          <label className="filter-field">
            <span>Fecha inicio</span>
            <input type="date" value={filters.fechaDesde} onChange={(event) => setFilters({ ...filters, fechaDesde: event.target.value })} />
          </label>
          <label className="filter-field">
            <span>Fecha fin</span>
            <input type="date" value={filters.fechaHasta} onChange={(event) => setFilters({ ...filters, fechaHasta: event.target.value })} />
          </label>
          <button type="submit" className="secondary-button">Filtrar</button>
          <button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button>
        </form>
      </section>

      {error && <div className="form-error">{error}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historial</h2>
            <p>{eventos.length} eventos registrados.</p>
          </div>
        </div>
        {isLoading ? <p className="table-empty">Cargando eventos...</p> : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Animal</th>
                  <th>Usuario</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((evento) => (
                  <tr key={evento.id}>
                    <td>{new Date(evento.fecha).toLocaleString()}</td>
                    <td><span className="status-pill status-active">{evento.tipo}</span></td>
                    <td><strong>#{evento.animal.caravana}</strong><span>{evento.animal.categoriaAnimal}</span></td>
                    <td>{evento.usuario?.nombre ?? 'Sin usuario'}</td>
                    <td>{evento.observaciones || '-'}</td>
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
