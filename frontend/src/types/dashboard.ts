import type { LucideIcon } from 'lucide-react';

export type MetricTone = 'emerald' | 'blue' | 'indigo' | 'pink';

export interface DashboardMetric {
  title: string;
  value: string;
  trendLabel: string;
  trend: 'up' | 'down' | 'neutral';
  tone: MetricTone;
  icon: LucideIcon;
}

export interface OperationalAlert {
  id: number;
  title: string;
  detail: string;
  severity: 'critical' | 'warning' | 'info';
}
