import type { Animal } from './animales';
import type { UserRole } from './auth';
import type { Lote } from './lotes';

export type TurnoOrdene = 'MANANA' | 'TARDE' | 'NOCHE';
export type EstadoLoteLeche = 'DISPONIBLE' | 'VENDIDO' | 'VENCIDO';

export type MotivoDescarteLeche =
  | 'MASTITIS'
  | 'ANTIBIOTICO'
  | 'CALOSTRO'
  | 'MALA_CALIDAD'
  | 'CONTAMINACION'
  | 'OTRO';

export interface LoteLeche {
  id: number;
  codigo: string;
  fechaProduccion: string;
  fechaVencimiento: string;
  fechaVenta: string | null;
  estado: EstadoLoteLeche;
  litrosTotales: number | string;
  litrosDescartados: number | string;
  litrosNetos: number | string;
  grasa: number | string | null;
  proteina: number | string | null;
  recuentoBacteriano: number | null;
  recuentoCelulasSomaticas: number | null;
  temperatura: number | string | null;
  observacionesCalidad: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProduccionAnimal {
  id: number;
  animalId: number;
  loteLecheId: number;
  usuarioId: number;
  fechaHora: string;
  turno: TurnoOrdene;
  litrosProducidos: number | string;
  litrosDescartados: number | string;
  motivoDescarte: MotivoDescarteLeche | null;
  observacionDescarte: string | null;
  createdAt: string;
  updatedAt: string;
  animal: Pick<Animal, 'id' | 'caravana' | 'nombre' | 'categoria' | 'estadoReproductivo' | 'activo' | 'estadoAnimal' | 'loteId'> & {
    lote: Pick<Lote, 'id' | 'nombre' | 'activo'>;
  };
  loteLeche: LoteLeche;
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  };
}

export interface ProduccionFilters {
  fechaDesde: string;
  fechaHasta: string;
  animalId: string;
  loteId: string;
  loteLecheId: string;
  turno: string;
}

export interface ProduccionFormValues {
  loteId: string;
  animalId: string;
  loteLecheId: string;
  fechaHora: string;
  turno: TurnoOrdene;
  litrosProducidos: string;
  litrosDescartados: string;
  motivoDescarte: MotivoDescarteLeche | '';
  observacionDescarte: string;
}

export interface LoteLecheFormValues {
  codigo: string;
  fechaProduccion: string;
  fechaVencimiento: string;
  estado: EstadoLoteLeche;
  grasa: string;
  proteina: string;
  recuentoBacteriano: string;
  recuentoCelulasSomaticas: string;
  temperatura: string;
  observacionesCalidad: string;
}

export interface ProduccionEvolucionDiaria {
  fecha: string;
  litrosNetos: number;
  litrosProducidos: number;
  litrosDescartados: number;
}

export interface ProduccionResumen {
  totalLitrosProducidos: number;
  totalLitrosDescartados: number;
  totalLitrosNetos: number;
  promedioPorAnimal: number;
  cantidadAnimalesRegistrados: number;
  cantidadRegistros: number;
  alertaDescarte: boolean;
  evolucionDiaria: ProduccionEvolucionDiaria[];
}

export interface ProduccionPorAnimal {
  animal: Animal;
  historial: ProduccionAnimal[];
  litrosTotales: number;
  litrosDescartados: number;
  litrosNetos: number;
  promedioPorOrdene: number;
  proteinaPromedio: number;
  recuentoBacterianoPromedio: number;
  evolucion: ProduccionEvolucionDiaria[];
}

export interface ProduccionPorLote {
  lote: Pick<Lote, 'id' | 'nombre' | 'descripcion' | 'activo'>;
  litrosTotales: number;
  litrosDescartados: number;
  litrosNetos: number;
  promedioPorAnimal: number;
  proteinaPromedio: number;
  recuentoBacterianoPromedio: number;
  rankingAnimales: Array<{
    animal: ProduccionAnimal['animal'];
    litrosTotales: number;
    litrosDescartados: number;
    litrosNetos: number;
    promedioPorOrdene: number;
  }>;
  evolucionDiaria: ProduccionEvolucionDiaria[];
}

export interface ProduccionPorLoteLeche {
  loteLeche: LoteLeche & { producciones: ProduccionAnimal[] };
  animales: Array<{
    animal: ProduccionAnimal['animal'];
    litrosNetos: number;
  }>;
}
