import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { getAnimalFicha } from '../services/animalesService';
import type { AnimalFicha } from '../types/animales';

interface AnimalFichaPageProps {
  authToken: string | null;
  onUnauthorized: () => void;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

export function AnimalFichaPage({ authToken, onUnauthorized }: AnimalFichaPageProps) {
  const { id } = useParams();
  const location = useLocation();
  const [animal, setAnimal] = useState<AnimalFicha | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const backState = location.state as { from?: string; label?: string } | null;
  const backTo = backState?.from ?? '/rodeos';
  const backLabel = backState?.label ?? 'Volver a Rodeo';

  async function loadFicha() {
    if (!authToken || !id) return;
    setIsLoading(true);
    setError('');

    try {
      setAnimal(await getAnimalFicha(authToken, Number(id)));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onUnauthorized();
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la ficha del animal.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadFicha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, id]);

  if (!animal && isLoading) {
    return <p className="table-empty">Cargando ficha del animal...</p>;
  }

  return (
    <div className="settings-page animal-ficha-page">
      <section className="settings-header">
        <div>
          <Link className="back-link" to={backTo}>
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
          <h2>{animal ? `Ficha #${animal.caravana}` : 'Ficha del animal'}</h2>
          <p>{animal?.nombre || 'Informacion integral del animal.'}</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void loadFicha()} aria-label="Actualizar ficha">
          <RefreshCcw size={18} />
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}

      {animal && (
        <>
          {!animal.activo && (
            <section className="panel inactive-animal-alert">
              <div>
                <h2>Animal inactivo</h2>
                <p>Este registro permanece disponible para conservar su historial.</p>
              </div>
              <div className="info-grid">
                <InfoItem label="Motivo de baja" value={animal.estadoAnimal} />
                <InfoItem label="Fecha de baja" value={formatDate(animal.fechaBaja)} />
                <InfoItem label="Observaciones" value={animal.observacionesBaja} />
              </div>
            </section>
          )}

          <div className="ficha-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Datos generales</h2>
                  <p>Identificacion y clasificacion actual.</p>
                </div>
              </div>
              <div className="info-grid">
                <InfoItem label="Caravana" value={`#${animal.caravana}`} />
                <InfoItem label="Nombre" value={animal.nombre} />
                <InfoItem label="Categoria" value={animal.categoria} />
                <InfoItem label="Estado reproductivo" value={animal.estadoReproductivo} />
                <InfoItem label="Estado animal" value={animal.estadoAnimal} />
                <InfoItem label="Lote" value={animal.lote.nombre} />
                <InfoItem label="Fecha nacimiento" value={formatDate(animal.fechaNacimiento)} />
                <InfoItem label="Padre" value={animal.padreNombre} />
                <InfoItem label="Madre" value={animal.madre ? `#${animal.madre.caravana}` : null} />
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Estado actual</h2>
                  <p>Situacion operativa del animal.</p>
                </div>
              </div>
              <div className="info-grid">
                <InfoItem label="Activo" value={animal.activo ? 'Si' : 'No'} />
                <InfoItem label="Raza" value={animal.raza} />
                <InfoItem label="Alta en sistema" value={formatDate(animal.createdAt)} />
                <InfoItem label="Ultima actualizacion" value={formatDate(animal.updatedAt)} />
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Genealogia</h2>
                <p>Madre, padre y crias registradas.</p>
              </div>
            </div>
            <div className="genealogy-grid">
              <div className="genealogy-box">
                <span>Madre</span>
                <strong>{animal.madre ? `#${animal.madre.caravana}` : '-'}</strong>
                <p>{animal.madre?.nombre || 'Sin madre registrada'}</p>
              </div>
              <div className="genealogy-box">
                <span>Padre</span>
                <strong>{animal.padreNombre || '-'}</strong>
                <p>{animal.padreNombre ? 'Nombre externo registrado' : 'Sin padre registrado'}</p>
              </div>
              <div className="genealogy-box genealogy-box-wide">
                <span>Crias / hijos</span>
                {animal.hijos.length === 0 ? (
                  <p>Sin crias registradas.</p>
                ) : (
                  <div className="chip-list">
                    {animal.hijos.map((hijo) => (
                      <Link key={hijo.id} className="lineage-chip" to={`/rodeos/${hijo.id}`}>
                        #{hijo.caravana} · {hijo.categoria} · {hijo.activo ? 'Activo' : hijo.estadoAnimal}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Historial de eventos</h2>
                <p>{animal.eventos.length} eventos registrados.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Usuario</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {animal.eventos.map((evento) => (
                    <tr key={evento.id}>
                      <td>{formatDateTime(evento.fecha)}</td>
                      <td><span className="status-pill status-active">{evento.tipo}</span></td>
                      <td>{evento.usuario?.nombre ?? 'Sin usuario'}</td>
                      <td>{evento.observaciones || '-'}</td>
                    </tr>
                  ))}
                  {animal.eventos.length === 0 && (
                    <tr><td colSpan={4}>Sin eventos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Agenda del animal</h2>
                <p>{animal.tareas.length} tareas historicas y pendientes.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Fecha programada</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {animal.tareas.map((tarea) => (
                    <tr key={tarea.id}>
                      <td>{formatDate(tarea.fechaProgramada)}</td>
                      <td>{tarea.tipo}</td>
                      <td><span className={`status-pill ${tarea.estado === 'PENDIENTE' ? 'status-active' : 'status-inactive'}`}>{tarea.estado}</span></td>
                      <td>{tarea.descripcion || '-'}</td>
                    </tr>
                  ))}
                  {animal.tareas.length === 0 && (
                    <tr><td colSpan={4}>Sin tareas de agenda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
