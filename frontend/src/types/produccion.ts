import type { Animal } from './animales';
import type { UserRole } from './auth';
import type { Lote } from './lotes';

export type TurnoOrdene = 'MANANA' | 'TARDE' | 'NOCHE';

export type MotivoDescarteLeche =
  | 'MASTITIS'
  | 'ANTIBIOTICO'
  | 'CALOSTRO'
  | 'MALA_CALIDAD'
  | 'CONTAMINACION'
  | 'OTRO';

export interface ProduccionAnimal {
  id: number;
  animalId: number;
  fechaHora: string;
  fecha: string;
  turno: TurnoOrdene;
  litrosProducidos: number | string;
  litrosDescartados: number | string;
  motivoDescarte: MotivoDescarteLeche | null;
  observacionDescarte: string | null;
  temperaturaTanque: number | string | null;
  grasa: number | string | null;
  proteina: number | string | null;
  recuentoCelulasSomaticas: number | null;
  recuentoBacteriano: number | null;
  observacionesCalidad: string | null;
  usuarioId: number | null;
  createdAt: string;
  updatedAt: string;
  animal: Pick<Animal, 'id' | 'caravana' | 'nombre' | 'categoria' | 'activo' | 'estadoAnimal' | 'loteId'> & {
    lote: Pick<Lote, 'id' | 'nombre' | 'activo'>;
  };
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  } | null;
}

export interface ProduccionFilters {
  fechaDesde: string;
  fechaHasta: string;
  animalId: string;
  loteId: string;
  turno: string;
}

export interface ProduccionFormValues {
  animalId: string;
  fechaHora: string;
  turno: TurnoOrdene;
  litrosProducidos: string;
  litrosDescartados: string;
  motivoDescarte: MotivoDescarteLeche | '';
  observacionDescarte: string;
  temperaturaTanque: string;
  grasa: string;
  proteina: string;
  recuentoCelulasSomaticas: string;
  recuentoBacteriano: string;
  observacionesCalidad: string;
}

export interface ProduccionEvolucionDiaria {
  fecha: string;
  litrosNetos: number;
  litrosProducidos: number;
  litrosDescartados: number;
}

export interface AlertaProduccion {
  animalId: number;
  caravana: string;
  loteId: number;
  loteNombre: string;
  mensaje: string;
}

export interface ProduccionResumen {
  totalLitrosProducidos: number;
  totalLitrosDescartados: number;
  totalLitrosNetos: number;
  promedioPorAnimal: number;
  cantidadAnimalesRegistrados: number;
  cantidadRegistros: number;
  alertasBajoRendimiento: AlertaProduccion[];
  alertasFaltantes: AlertaProduccion[];
  alertaDescarte: boolean;
  alertasCalidad: string[];
  evolucionDiaria: ProduccionEvolucionDiaria[];
}

export interface ProduccionPorAnimal {
  animal: Animal;
  historial: ProduccionAnimal[];
  totalProducido: number;
  promedioDiario: number;
  promedioPorOrdene: number;
  mejorRegistro: ProduccionAnimal | null;
  peorRegistro: ProduccionAnimal | null;
  litrosDescartadosTotales: number;
  evolucion: ProduccionEvolucionDiaria[];
  bajoRendimiento: boolean;
}

export interface ProduccionPorLote {
  lote: Pick<Lote, 'id' | 'nombre' | 'descripcion' | 'activo'>;
  totalProducido: number;
  promedioPorAnimal: number;
  rankingAnimales: Array<{
    animal: ProduccionAnimal['animal'];
    totalProducido: number;
    promedioPorOrdene: number;
  }>;
  animalesBajoRendimiento: AlertaProduccion[];
  evolucionDiaria: ProduccionEvolucionDiaria[];
}
