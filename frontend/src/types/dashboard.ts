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

export interface AlertaAlimentacion {
  alimento: string;
  lote?: string;
  mensaje: string;
  severidad: 'CRITICA' | 'MEDIA' | 'INFO';
  diasCobertura?: number;
}

export interface AlertaSanitaria {
  tipo: 'ANTIAFTOSA' | 'BRUCELOSIS' | 'TUBERCULINA' | 'ANALISIS_BRUCELOSIS';
  mensaje: string;
  fechaLimite: string | null;
  ultimaAplicacion: string | null;
  estado: 'VENCIDA' | 'PROXIMA' | 'OK' | 'PENDIENTE';
}

export interface AlertaPrioritaria {
  titulo: string;
  detalle: string;
  severidad: 'CRITICA' | 'MEDIA' | 'INFO';
  accionSugerida: string;
}

export interface CoberturaAlimento {
  alimento: string;
  stockActual: number;
  unidad: 'KG' | 'ROLLO' | 'UNIDAD';
  consumoDiarioEstimado: number;
  diasCobertura: number | null;
  estado: 'CRITICO' | 'ATENCION' | 'OK' | 'SIN_CALCULO';
}

export interface ControlSanitario {
  tipo: 'ANTIAFTOSA' | 'BRUCELOSIS' | 'TUBERCULINA' | 'ANALISIS_BRUCELOSIS';
  nombre: string;
  ultimaAplicacion: string | null;
  proximaFechaEsperada: string | null;
  estado: 'OK' | 'PROXIMO' | 'PENDIENTE' | 'VENCIDO';
}

export interface DashboardTareaDetalle {
  id: number;
  tipoTarea: string;
  fechaProyectada: string;
  estado: string;
  descripcion: string | null;
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
  alertasAlimentacion: AlertaAlimentacion[];
  alertasSanitarias: AlertaSanitaria[];
  alertasPrioritarias: AlertaPrioritaria[];
  coberturaAlimentos: CoberturaAlimento[];
  controlesSanitarios: ControlSanitario[];
  tareasHoyDetalle: DashboardTareaDetalle[];
  tareasProximos7Dias: DashboardTareaDetalle[];
  ultimosEventos: DashboardUltimoEvento[];
}
