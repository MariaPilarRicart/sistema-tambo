import type { Lote } from './lotes';

export type CategoriaAnimal = 'TERNERA' | 'VAQUILLONA' | 'VACA' | 'TORO';
export type EstadoReproductivo = 'NO_APLICA' | 'VACIA' | 'INSEMINADA' | 'PRENADA' | 'SECA' | 'RECUPERACION';
export type EstadoAnimal = 'ACTIVO' | 'VENDIDO' | 'MUERTO' | 'ROBADO' | 'TRASLADADO' | 'OTRO';
export type MotivoBajaAnimal = Exclude<EstadoAnimal, 'ACTIVO'>;

export interface Animal {
  id: number;
  caravana: string;
  nombre: string | null;
  fechaNacimiento: string;
  raza: string | null;
  categoria: CategoriaAnimal;
  estadoReproductivo: EstadoReproductivo;
  estadoAnimal: EstadoAnimal;
  activo: boolean;
  fechaBaja: string | null;
  observacionesBaja: string | null;
  loteId: number;
  madreId: number | null;
  padreNombre: string | null;
  createdAt: string;
  updatedAt: string;
  lote: Pick<Lote, 'id' | 'nombre' | 'activo'>;
  madre: {
    id: number;
    caravana: string;
    nombre: string | null;
  } | null;
}

export interface AnimalFormValues {
  caravana: string;
  nombre: string;
  fechaNacimiento: string;
  raza: string;
  categoria: CategoriaAnimal;
  estadoReproductivo: EstadoReproductivo;
  estadoAnimal: EstadoAnimal;
  activo: boolean;
  loteId: string;
  madreId: string;
  padreNombre: string;
}

export interface AnimalFilters {
  caravana: string;
  loteId: string;
  estadoReproductivo: string;
  estadoAnimal: string;
  activo: string;
}

export interface AnimalDeactivateValues {
  estadoAnimal: MotivoBajaAnimal;
  observacionesBaja: string;
}
