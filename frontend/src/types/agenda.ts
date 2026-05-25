import type { CategoriaAnimal, EstadoAnimal, EstadoReproductivo } from './animales';

export type TipoTarea = 'TACTO' | 'SECADO' | 'PARTO' | 'ALTA_POST_PARTO' | 'VACUNACION' | 'CONTROL_CLINICO';
export type EstadoTarea = 'PENDIENTE' | 'REALIZADA' | 'CANCELADA';

export interface AgendaTarea {
  id: number;
  tipo: TipoTarea;
  fechaProgramada: string;
  fechaRealizacion: string | null;
  estado: EstadoTarea;
  descripcion: string | null;
  animalId: number;
  eventoOrigenId: number | null;
  eventoCierreId: number | null;
  animal: {
    id: number;
    caravana: string;
    categoria: CategoriaAnimal;
    estadoReproductivo: EstadoReproductivo;
    estadoAnimal: EstadoAnimal;
    activo: boolean;
    lote: {
      id: number;
      nombre: string;
    };
  };
}
