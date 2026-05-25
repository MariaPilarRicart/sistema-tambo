import type { UserRole } from './auth';
import type { Lote } from './lotes';

export interface Racion {
  id: number;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RacionFormValues {
  nombre: string;
  descripcion: string;
  activa: boolean;
}

export interface RegistroAlimentacion {
  id: number;
  fecha: string;
  loteId: number;
  racionId: number;
  cantidadKg: number;
  observaciones: string | null;
  usuarioId: number | null;
  createdAt: string;
  updatedAt: string;
  lote: Pick<Lote, 'id' | 'nombre' | 'activo'>;
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
  loteId: string;
  racionId: string;
  cantidadKg: string;
  observaciones: string;
}

export interface AlimentacionResumen {
  totalKgEntregados: number;
  registrosHoy: number;
  racionesActivas: number;
  lotesAlimentados: number;
  alimentacionPorLote: Array<{
    loteId: number;
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
