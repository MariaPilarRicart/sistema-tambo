import type { Lote } from './lotes';
import type { EstadoTarea, EstadoTareaCalculado, TipoTarea } from './agenda';
import type { UserRole } from './auth';
import type { TipoEvento } from './eventos';

export type CategoriaAnimal =
  | 'GUACHERA'
  | 'ESCUELITA'
  | 'TERNERA'
  | 'VAQUILLONA'
  | 'VACA_PRODUCCION'
  | 'VACA_SECA'
  | 'PREPARTO'
  | 'TORO'
  | 'BAJA';
export type EstadoReproductivo = 'NO_APLICA' | 'VACIA' | 'INSEMINADA' | 'PRENADA' | 'SECA' | 'RECUPERACION';
export type EstadoAnimal = 'ACTIVO' | 'VENDIDO' | 'MUERTO' | 'ROBADO' | 'TRASLADADO' | 'OTRO';
export type MotivoBajaAnimal = Exclude<EstadoAnimal, 'ACTIVO'>;

export interface Animal {
  id: number;
  caravana: string;
  nombre: string | null;
  fechaNacimiento: string;
  raza: string | null;
  categoriaAnimal: CategoriaAnimal;
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
  categoriaAnimal: CategoriaAnimal;
  estadoReproductivo: EstadoReproductivo;
  estadoAnimal: EstadoAnimal;
  activo: boolean;
  loteId: string;
  madreId: string;
  padreNombre: string;
}

export interface AnimalFilters {
  caravana: string;
  categoriaAnimal: string;
  loteId: string;
  estadoReproductivo: string;
  estadoAnimal: string;
  activo: string;
}

export interface RodeoResumen {
  totalAnimales: number;
  animalesActivos: number;
  prenadas: number;
  inseminadas: number;
  vacias: number;
  secasRecuperacion: number;
}

export interface AnimalDeactivateValues {
  estadoAnimal: MotivoBajaAnimal;
  observacionesBaja: string;
}

export interface AnimalFicha extends Animal {
  hijos: Array<{
    id: number;
    caravana: string;
    nombre: string | null;
    categoriaAnimal: CategoriaAnimal;
    estadoAnimal: EstadoAnimal;
    activo: boolean;
  }>;
  eventos: Array<{
    id: number;
    tipo: TipoEvento;
    fecha: string;
    observaciones: string | null;
    datosJson: unknown;
    usuario: {
      id: number;
      nombre: string;
      username: string;
      rol: UserRole;
    } | null;
  }>;
  tareas: Array<{
    id: number;
    tipo: TipoTarea;
    fechaProgramada: string;
    fechaRealizacion: string | null;
    estado: EstadoTarea;
    estadoCalculado: EstadoTareaCalculado;
    descripcion: string | null;
    eventoOrigenId: number | null;
    eventoCierreId: number | null;
  }>;
}
