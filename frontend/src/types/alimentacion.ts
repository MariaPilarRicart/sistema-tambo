import type { UserRole } from './auth';
import type { CategoriaAnimal } from './animales';

export interface Racion {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoriaAnimal: CategoriaAnimal | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RacionFormValues {
  nombre: string;
  descripcion: string;
  categoriaAnimal: CategoriaAnimal | '';
  activa: boolean;
}

export interface RegistroAlimentacion {
  id: number;
  fecha: string;
  categoriaAnimal: CategoriaAnimal;
  racionId: number;
  cantidadKg: number;
  observaciones: string | null;
  usuarioId: number | null;
  createdAt: string;
  updatedAt: string;
  racion: Pick<Racion, 'id' | 'nombre' | 'descripcion' | 'activa'>;
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  } | null;
}

export interface RegistroAlimentacionFormValues {
  fecha: string;
  categoriaAnimal: CategoriaAnimal | '';
  racionId: string;
  cantidadKg: string;
  observaciones: string;
}

export interface AlimentacionResumen {
  totalKgEntregados: number;
  registrosHoy: number;
  racionesActivas: number;
  categoriasAlimentadas: number;
  alimentacionPorCategoria: Array<{
    categoriaAnimal: CategoriaAnimal;
    nombre: string;
    totalKg: number;
  }>;
  alimentacionPorRacion: Array<{
    racionId: number;
    nombre: string;
    totalKg: number;
  }>;
  ultimosRegistros: RegistroAlimentacion[];
}

export type TipoMovimientoStockAlimentacion = 'ENTRADA' | 'CONSUMO' | 'AJUSTE';

export interface InsumoAlimentacion {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsumoAlimentacionFormValues {
  nombre: string;
  descripcion: string;
  unidadMedida: string;
  stockMinimo: string;
  activo: boolean;
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
  insumo: Pick<InsumoAlimentacion, 'id' | 'nombre' | 'unidadMedida' | 'stockActual' | 'stockMinimo' | 'activo'>;
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  } | null;
}

export interface MovimientoStockAlimentacionFormValues {
  fecha: string;
  insumoId: string;
  tipoMovimiento: TipoMovimientoStockAlimentacion;
  cantidad: string;
  observaciones: string;
}

export interface StockAlimentacionResumen {
  totalInsumosActivos: number;
  insumosBajoStock: InsumoAlimentacion[];
  movimientosHoy: number;
  ultimosMovimientos: MovimientoStockAlimentacion[];
  stockPorInsumo: Array<InsumoAlimentacion & { bajoStock: boolean }>;
}
