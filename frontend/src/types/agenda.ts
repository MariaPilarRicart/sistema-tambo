import type { CategoriaAnimal, EstadoAnimal, EstadoReproductivo } from './animales';

export type TipoTarea = 'TACTO' | 'SECADO' | 'PARTO' | 'ALTA_POST_PARTO' | 'VACUNACION' | 'CONTROL_CLINICO';
export type EstadoTarea = 'PENDIENTE' | 'REALIZADA' | 'CANCELADA';
export type TipoSanitario = string;

export interface AgendaTarea {
  id: number;
  tipo: TipoTarea;
  fechaProgramada: string;
  fechaObjetivo: string | null;
  fechaRealizacion: string | null;
  estado: EstadoTarea;
  descripcion: string | null;
  animalId: number;
  usuarioId: number | null;
  eventoOrigenId: number | null;
  eventoCierreId: number | null;
  tipoSanitario: TipoSanitario | null;
  alcanceTipo: string | null;
  alcanceLoteId: number | null;
  alcanceCategoria: CategoriaAnimal | null;
  grupoSanitarioId: string | null;
  cantidadAnimalesAlcanzados: number | null;
  animal: {
    id: number;
    caravana: string;
    nombre: string | null;
    fechaNacimiento: string;
    loteId: number;
    categoriaAnimal: CategoriaAnimal;
    estadoReproductivo: EstadoReproductivo;
    estadoAnimal: EstadoAnimal;
    activo: boolean;
    lote: {
      id: number;
      nombre: string;
    };
  };
}

export interface CancelAgendaTaskValues {
  observacion: string;
}
