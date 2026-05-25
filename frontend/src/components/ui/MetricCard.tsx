import type { DashboardMetric } from '../../types/dashboard';

interface MetricCardProps {
  metric: DashboardMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const Icon = metric.icon;

  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <div className={`metric-icon metric-icon-${metric.tone}`}>
          <Icon size={22} />
        </div>
        <span className={`trend-pill trend-${metric.trend}`}>{metric.trendLabel}</span>
      </div>
      <p className="metric-title">{metric.title}</p>
      <h3 className="metric-value">{metric.value}</h3>
    </article>
  );
}
