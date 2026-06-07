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

export type DashboardPeriodo = 'hoy' | 'semana' | 'mes' | 'anio';

export interface DashboardSerieProduccion {
  etiqueta: string;
  litrosProducidos: number;
  litrosNetos: number;
  litrosDescartados: number;
}

export interface DashboardResumenProduccion {
  litrosProducidos: number;
  litrosNetos: number;
  litrosDescartados: number;
  porcentajeDescarte: number;
  cantidadRegistros: number;
  animalesConProduccion: number;
  promedioLitrosPorAnimal: number | null;
  ultimoLote: {
    id: number;
    codigo: string;
    fechaProduccion: string;
    litrosNetos: number;
  } | null;
  loteMayorProduccion: {
    codigo: string;
    litrosProducidos: number;
  } | null;
  series: DashboardSerieProduccion[];
}

export interface DashboardResumenVentas {
  litrosVendidos: number;
  facturacion: number;
  precioPromedioLitro: number | null;
  cantidadVentas: number;
  ultimasVentas: Array<{
    id: number;
    fecha: string;
    factura: string;
    cliente: string;
    litros: number;
    total: number;
  }>;
}

export interface DashboardResumenLeche {
  litrosDisponibles: number;
  lotesDisponibles: number;
  lotesProximosAVencer: number;
  lotes: Array<{
    id: number;
    codigo: string;
    fechaProduccion: string;
    fechaVencimiento: string;
    litrosNetos: number;
    litrosVendidos: number;
    litrosDisponibles: number;
    estado: string;
  }>;
}

export interface DashboardResumenAlimentacion {
  insumosActivos: number;
  insumosBajoMinimo: number;
  insumos: Array<{
    id: number;
    alimento: string;
    stockActual: number;
    stockMinimo: number;
    unidad: string;
    estado: 'OK' | 'BAJO' | 'CRITICO';
  }>;
  ultimosMovimientos: Array<{
    id: number;
    fecha: string;
    tipoMovimiento: string;
    alimento: string;
    cantidad: number;
    unidad: string;
  }>;
  ultimosRegistros: Array<{
    id: number;
    fecha: string;
    lote: string;
    racion: string;
    cantidadKg: number;
  }>;
}

export interface DashboardResumenSanidad {
  tareasSanitariasVencidas: number;
  tareasSanitariasProximas: number;
  controlesPendientes: number;
  tareas: Array<{
    id: number;
    tipo: string;
    fechaObjetivo: string;
    alcance: string;
    estado: string;
    lote: string | null;
    categoria: string | null;
  }>;
  ultimosEventos: Array<{
    id: number;
    fecha: string;
    tipo: TipoEvento;
    animal: string | null;
    observaciones: string | null;
  }>;
}

export interface DashboardAlertaGestion {
  titulo: string;
  detalle: string;
  severidad: 'CRITICA' | 'MEDIA' | 'INFO';
  accionSugerida: string;
}

export interface DashboardResumen {
  periodo: DashboardPeriodo;
  fechaDesde: string;
  fechaHasta: string;
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
  resumenProduccion: DashboardResumenProduccion;
  resumenVentas: DashboardResumenVentas;
  resumenLeche: DashboardResumenLeche;
  resumenAlimentacion: DashboardResumenAlimentacion;
  resumenSanidad: DashboardResumenSanidad;
  alertasGestion: DashboardAlertaGestion[];
  ultimosEventos: DashboardUltimoEvento[];
}
