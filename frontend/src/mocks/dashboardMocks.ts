import { Activity, Droplet, Heart, ShieldCheck, Wheat, Syringe } from 'lucide-react';
import type { DashboardMetric, OperationalAlert } from '../types/dashboard';

export const dashboardMetrics: DashboardMetric[] = [
  {
    title: 'Producción Diaria',
    value: '28.500 L',
    trendLabel: '+2.5%',
    trend: 'up',
    tone: 'emerald',
    icon: Droplet,
  },
  {
    title: 'Promedio por Vaca',
    value: '24.5 L',
    trendLabel: '-0.5 L',
    trend: 'down',
    tone: 'blue',
    icon: Activity,
  },
  {
    title: 'Calidad (RCS)',
    value: '180 k',
    trendLabel: 'Optimo',
    trend: 'up',
    tone: 'indigo',
    icon: ShieldCheck,
  },
  {
    title: 'Tasa de prenez',
    value: '68%',
    trendLabel: '+1.2%',
    trend: 'up',
    tone: 'pink',
    icon: Heart,
  },
];

export const productionChartData = [
  26500, 26800, 27000, 26900, 27200, 27500, 27400, 27800, 28000, 28100, 28300, 28000, 27900, 28200, 28500,
];

export const operationalAlerts: OperationalAlert[] = [
  {
    id: 1,
    title: 'Vacuna vencida',
    detail: 'Guachera requiere revision sanitaria.',
    severity: 'critical',
  },
  {
    id: 2,
    title: 'Stock bajo',
    detail: 'Silaje de maiz por debajo del minimo.',
    severity: 'warning',
  },
];

export const alertIcons = {
  critical: Syringe,
  warning: Wheat,
  info: ShieldCheck,
} as const;
