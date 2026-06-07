import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { EmployeeDashboard } from '../components/dashboard/EmployeeDashboard';
import { ApiError } from '../services/apiClient';
import { getDashboardResumen } from '../services/dashboardService';
import type { AuthUser } from '../types/auth';
import type { DashboardPeriodo, DashboardResumen } from '../types/dashboard';

interface DashboardPageProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  onUnauthorized: () => void;
}

export function DashboardPage({ authToken, currentUser, onUnauthorized }: DashboardPageProps) {
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [periodo, setPeriodo] = useState<DashboardPeriodo>('hoy');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [periodoError, setPeriodoError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function loadDashboard() {
    if (!authToken) return;
    if (periodo === 'personalizado') {
      if (!fechaDesde || !fechaHasta) {
        setPeriodoError('Seleccioná fecha desde y fecha hasta');
        return;
      }
      if (fechaDesde > fechaHasta) {
        setPeriodoError('La fecha desde no puede ser mayor a la fecha hasta');
        return;
      }
    }

    setIsLoading(true);
    setError('');
    setPeriodoError('');

    try {
      setResumen(await getDashboardResumen(
        authToken,
        periodo,
        periodo === 'personalizado' ? { fechaDesde, fechaHasta } : undefined,
      ));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onUnauthorized();
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, periodo]);

  function handlePeriodoChange(nextPeriodo: DashboardPeriodo) {
    setPeriodo(nextPeriodo);
    setPeriodoError('');
    if (nextPeriodo !== 'personalizado') {
      setFechaDesde('');
      setFechaHasta('');
    }
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-toolbar">
        <div>
          <p>
            {currentUser?.role === 'EMPLEADO'
              ? 'Vista operativa de tareas y accesos diarios.'
              : 'Indicadores reales de animales, eventos y agenda.'}
          </p>
        </div>
        <button
          type="button"
          className="secondary-button dashboard-refresh-button"
          onClick={() => void loadDashboard()}
          aria-label="Actualizar dashboard"
        >
          <RefreshCcw size={18} />
          Actualizar
        </button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {isLoading && <p className="table-empty">Cargando dashboard...</p>}

      {resumen && currentUser?.role === 'ADMIN' && (
        <AdminDashboard
          periodo={periodo}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          periodoError={periodoError}
          resumen={resumen}
          onFechaDesdeChange={setFechaDesde}
          onFechaHastaChange={setFechaHasta}
          onPeriodoChange={handlePeriodoChange}
          onApplyCustomPeriod={() => void loadDashboard()}
          onClearCustomPeriod={() => {
            setFechaDesde('');
            setFechaHasta('');
            setPeriodoError('');
            setPeriodo('hoy');
          }}
        />
      )}
      {resumen && currentUser?.role === 'EMPLEADO' && <EmployeeDashboard resumen={resumen} />}
    </div>
  );
}
