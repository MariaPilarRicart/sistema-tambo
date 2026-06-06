import type { CategoriaAnimal, EstadoAnimal, EstadoReproductivo } from './animales';

export type TipoTarea = 'TACTO' | 'SECADO' | 'PARTO' | 'ALTA_POST_PARTO' | 'VACUNACION' | 'CONTROL_CLINICO';
export type EstadoTarea = 'PENDIENTE' | 'REALIZADA' | 'CANCELADA';
export type TipoSanitario = 'AFTOSA' | 'BRUCELOSIS' | 'ANALISIS_TUBERCULINA' | 'ANALISIS_BRUCELOSIS' | 'OTRA';

export interface AgendaTarea {
  id: number;
  tipo: TipoTarea;
  fechaProgramada: string;
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

export interface ListadosOperativos {
  vencidas: AgendaTarea[];
  hoy: AgendaTarea[];
  proximas: AgendaTarea[];
  tactos: AgendaTarea[];
  secados: AgendaTarea[];
  partos: AgendaTarea[];
  altasPostParto: AgendaTarea[];
}

export interface CancelAgendaTaskValues {
  observacion: string;
}
