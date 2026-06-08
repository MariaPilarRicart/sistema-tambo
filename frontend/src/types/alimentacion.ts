import type { UserRole } from './auth';
import type { CategoriaAnimal } from './animales';

export type TipoAlimento = 'SILO' | 'BALANCEADO' | 'FIBRA' | 'SUPLEMENTO' | 'SALES' | 'OTRO';
export type UnidadAlimento = 'KG' | 'ROLLO' | 'UNIDAD';
export type TipoCalculoAlimentacion =
  | 'KG_POR_ANIMAL_DIA'
  | 'ROLLOS_POR_GRUPO_DURACION'
  | 'OBLIGATORIO_SIN_CANTIDAD';
export type TipoMovimientoStockAlimentacion = 'ENTRADA' | 'BAJA' | 'CONSUMO' | 'MODIFICACION';
export type EstadoStockAlimentacion = 'NORMAL' | 'BAJO' | 'AGOTADO' | 'INACTIVO';

export interface Alimento {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipoAlimento: TipoAlimento;
  unidadMedida: UnidadAlimento;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
  estado?: EstadoStockAlimentacion;
  createdAt: string;
  updatedAt: string;
}

export interface AlimentoFormValues {
  nombre: string;
  tipoAlimento: TipoAlimento;
  unidad: UnidadAlimento;
  stockActual: string;
  puntoStockMinimo: string;
  activo: boolean;
  observaciones: string;
}

export interface ReglaAlimentacion {
  id: number;
  nombre: string;
  categoriaAnimal: CategoriaAnimal;
  alimentoId?: number;
  tipoCalculo?: TipoCalculoAlimentacion;
  unidad?: UnidadAlimento;
  cantidadMinima?: number | null;
  cantidadMaxima?: number | null;
  animalesBase?: number | null;
  rollosBase?: number | null;
  duracionDias?: number | null;
  obligatorio?: boolean;
  activo: boolean;
  observaciones: string | null;
  alimento?: Alimento;
  detalles: DetalleReglaAlimentacion[];
  createdAt: string;
  updatedAt: string;
}

export interface DetalleReglaAlimentacion {
  id: number;
  reglaAlimentacionId: number;
  alimentoId: number;
  tipoCalculo: TipoCalculoAlimentacion;
  unidad: UnidadAlimento;
  cantidadMinima: number | null;
  cantidadMaxima: number | null;
  animalesBase: number | null;
  rollosBase: number | null;
  duracionDias: number | null;
  obligatorio: boolean;
  observaciones: string | null;
  alimento: Alimento;
}

export interface DetalleReglaAlimentacionFormValues {
  alimentoId: string;
  tipoCalculo: TipoCalculoAlimentacion;
  unidad: UnidadAlimento;
  cantidadMinima: string;
  cantidadMaxima: string;
  animalesBase: string;
  rollosBase: string;
  duracionDias: string;
  obligatorio: boolean;
  observaciones: string;
}

export interface ReglaAlimentacionFormValues {
  nombre: string;
  categoriaAnimal: CategoriaAnimal | '';
  alimentoId?: string;
  tipoCalculo?: TipoCalculoAlimentacion;
  unidad?: UnidadAlimento;
  cantidadMinima?: string;
  cantidadMaxima?: string;
  animalesBase?: string;
  rollosBase?: string;
  duracionDias?: string;
  obligatorio?: boolean;
  activo: boolean;
  observaciones: string;
  detalles: DetalleReglaAlimentacionFormValues[];
}

export interface AlimentacionResumen {
  alimentacionesRegistradasHoy: number;
  lotesAlimentadosHoy: number;
  insumosStockBajo: number;
  insumosAgotados: number;
}

export interface SugerenciaAlimentacionDetalle {
  reglaId: number;
  alimentoId: number;
  alimento: string;
  tipoAlimento: TipoAlimento;
  unidad: UnidadAlimento;
  stockDisponible: number;
  obligatorio: boolean;
  tipoCalculo: TipoCalculoAlimentacion;
  cantidadSugeridaMinima: number | null;
  cantidadSugeridaMaxima: number | null;
  observacionesRegla: string | null;
}

export interface SugerenciaAlimentacion {
  lote: { id: number; nombre: string };
  cantidadAnimales: number;
  categoriaPredominante: CategoriaAnimal | null;
  categorias: CategoriaAnimal[];
  advertencia: string | null;
  detalles: SugerenciaAlimentacionDetalle[];
}

export interface RegistroAlimentacionDetalle {
  id: number;
  alimentacionId: number;
  insumoId: number;
  cantidad: number;
  unidad: UnidadAlimento;
  cantidadSugeridaMinima: number | null;
  cantidadSugeridaMaxima: number | null;
  observaciones: string | null;
  insumo: Alimento;
}

export interface RegistroAlimentacion {
  id: number;
  fecha: string;
  loteId: number | null;
  categoriaAnimal: CategoriaAnimal;
  cantidadAnimales: number | null;
  cantidadKg: number;
  observaciones: string | null;
  usuarioId: number | null;
  createdAt: string;
  updatedAt: string;
  lote: { id: number; nombre: string; activo: boolean } | null;
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  } | null;
  detalles: RegistroAlimentacionDetalle[];
}

export interface RegistrarAlimentacionPayload {
  fecha: string;
  loteId: number;
  categoriaAnimal: CategoriaAnimal;
  cantidadAnimales: number;
  observaciones: string | null;
  detalles: Array<{
    alimentoId: number;
    unidad: UnidadAlimento;
    cantidadSugeridaMinima: number | null;
    cantidadSugeridaMaxima: number | null;
    cantidadReal: number;
    observaciones: string | null;
  }>;
}

export interface MovimientoStockAlimentacion {
  id: number;
  insumoId: number;
  tipoMovimiento: TipoMovimientoStockAlimentacion;
  fecha: string;
  cantidad: number;
  observaciones: string | null;
  usuarioId: number | null;
  createdAt: string;
  updatedAt: string;
  insumo: Alimento;
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  } | null;
}
