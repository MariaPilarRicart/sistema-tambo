import { alertIcons, dashboardMetrics, operationalAlerts, productionChartData } from '../mocks/dashboardMocks';
import { MetricCard } from '../components/ui/MetricCard';

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="metric-grid">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.title} metric={metric} />
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h2>Produccion</h2>
              <p>Ultimos 30 dias</p>
            </div>
            <span className="panel-chip">Mock data</span>
          </div>

          <div className="bar-chart" aria-label="Grafico de produccion diaria">
            {productionChartData.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className="bar-chart-column"
                style={{ height: `${(value / 30000) * 100}%` }}
                title={`${value} litros`}
              />
            ))}
          </div>
        </section>

        <section className="panel alerts-panel">
          <div className="panel-header compact">
            <h2>Alertas Operativas</h2>
          </div>

          <div className="alert-list">
            {operationalAlerts.map((alert) => {
              const Icon = alertIcons[alert.severity];

              return (
                <article key={alert.id} className={`alert-card alert-${alert.severity}`}>
                  <Icon size={18} />
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
