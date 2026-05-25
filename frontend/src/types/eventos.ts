import type { CategoriaAnimal, EstadoReproductivo } from './animales';
import type { UserRole } from './auth';

export type TipoEvento =
  | 'CELO'
  | 'INSEMINACION'
  | 'TACTO'
  | 'SECADO'
  | 'PARTO'
  | 'ABORTO'
  | 'CLINICO'
  | 'VACUNACION'
  | 'CAMBIO_LOTE'
  | 'VENTA'
  | 'MUERTE';

export interface Evento {
  id: number;
  tipo: TipoEvento;
  fecha: string;
  observaciones: string | null;
  datosJson: unknown;
  animalId: number;
  usuarioId: number | null;
  animal: {
    id: number;
    caravana: string;
    categoria: CategoriaAnimal;
    estadoReproductivo: EstadoReproductivo;
  };
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  } | null;
}

export interface EventoFilters {
  tipo: string;
  animalId: string;
  fechaDesde: string;
  fechaHasta: string;
}

export interface EventoFormValues {
  tipo: TipoEvento;
  observaciones: string;
  resultadoTacto: 'POSITIVO' | 'NEGATIVO';
}
