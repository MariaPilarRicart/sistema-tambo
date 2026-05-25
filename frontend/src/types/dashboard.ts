import type { TipoEvento } from './eventos';
import type { LucideIcon } from 'lucide-react';

export type MetricTone = 'emerald' | 'blue' | 'indigo' | 'pink' | 'amber' | 'rose';

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

export interface DashboardGroup {
  id?: number;
  nombre: string;
  total: number;
}

export interface DashboardUltimoEvento {
  id: number;
  fecha: string;
  tipo: TipoEvento;
  observaciones: string | null;
  animal: {
    id: number;
    caravana: string;
    lote: {
      id: number;
      nombre: string;
    } | null;
  } | null;
}

export interface DashboardResumen {
  totalAnimales: number;
  animalesActivos: number;
  animalesInactivos: number;
  animalesPorEstadoAnimal: DashboardGroup[];
  animalesPorEstadoReproductivo: DashboardGroup[];
  animalesPorCategoria: DashboardGroup[];
  animalesPorLote: DashboardGroup[];
  tareasVencidas: number;
  tareasHoy: number;
  tareasFuturas: number;
  tactosPendientes: number;
  secadosPendientes: number;
  partosPendientes: number;
  ultimosEventos: DashboardUltimoEvento[];
}
