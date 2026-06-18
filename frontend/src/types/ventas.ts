import type { Cliente } from './clientes';
import type { AuthUser } from './auth';
import type { Ordene } from './produccion';

export type EstadoEntregaLeche = 'PENDIENTE' | 'LIQUIDADA' | 'ANULADA';

export interface EntregaLecheOrdene {
  id: number;
  entregaLecheId: number;
  ordeneId: number;
  litrosEntregados: number | string;
  ordene: Ordene;
}

export interface EntregaLeche {
  id: number;
  clienteId: number;
  fechaRetiro: string;
  observacion: string | null;
  estado: EstadoEntregaLeche;
  liquidacionId: number | null;
  createdAt: string;
  updatedAt: string;
  cliente: Cliente;
  usuario: (Pick<AuthUser, 'id' | 'username'> & { nombre: string; rol: AuthUser['role'] }) | null;
  liquidacion: {
    id: number;
    numero: string;
    mes: number;
    anio: number;
  } | null;
  ordenes: EntregaLecheOrdene[];
}

export interface LiquidacionLeche {
  id: number;
  clienteId: number;
  mes: number;
  anio: number;
  numero: string;
  fechaLiquidacion: string;
  precioLitro: number | string;
  litrosLiquidados: number | string;
  importeTotal: number | string;
  observacion: string | null;
  createdAt: string;
  updatedAt: string;
  cliente: Cliente;
  usuario: (Pick<AuthUser, 'id' | 'username'> & { nombre: string; rol: AuthUser['role'] }) | null;
  entregas: EntregaLeche[];
}

export interface VentasResumen {
  litrosEntregadosMes: number;
  retirosPendientes: number;
  liquidacionesMes: number;
  importeLiquidadoMes: number;
}

export interface EntregaFilters {
  clienteId: string;
  fechaDesde: string;
  fechaHasta: string;
  estado: string;
}

export interface LiquidacionFilters {
  clienteId: string;
  mes: string;
  anio: string;
}

export interface EntregaFormValues {
  clienteId: string;
  fechaRetiro: string;
  ordeneIds: string[];
  observacion: string;
}

export interface LiquidacionFormValues {
  clienteId: string;
  mes: string;
  anio: string;
  numero: string;
  fechaLiquidacion: string;
  precioLitro: string;
  litrosLiquidados: string;
  observacion: string;
}

export interface SugerenciaLiquidacion {
  litrosSugeridos: number;
  cantidadRetiros: number;
  entregas: EntregaLeche[];
}
