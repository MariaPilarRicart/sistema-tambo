import type { Animal } from './animales';
import type { UserRole } from './auth';
import type { Lote } from './lotes';

export type TurnoOrdene = 'MANANA' | 'TARDE' | 'NOCHE';
export type EstadoLoteLeche = 'DISPONIBLE' | 'VENDIDO' | 'VENCIDO' | 'INACTIVO';

export type MotivoDescarteLeche =
  | 'MASTITIS'
  | 'ANTIBIOTICO'
  | 'ANTIBIOTICOS'
  | 'CALOSTRO'
  | 'MALA_CALIDAD'
  | 'CONTAMINACION'
  | 'PROBLEMA_SANITARIO'
  | 'TEMPERATURA_FUERA_DE_RANGO'
  | 'OTRO';

export interface LoteLeche {
  id: number;
  codigo: string;
  descripcion: string | null;
  fechaProduccion: string;
  fechaVencimiento: string;
  fechaVenta: string | null;
  estado: EstadoLoteLeche;
  litrosTotales: number | string;
  litrosDescartados: number | string;
  litrosNetos: number | string;
  motivoDescarte: MotivoDescarteLeche | null;
  observacionDescarte: string | null;
  grasa: number | string | null;
  proteina: number | string | null;
  recuentoBacteriano: number | null;
  recuentoCelulasSomaticas: number | null;
  temperatura: number | string | null;
  observacionesCalidad: string | null;
  litrosVendidos?: number;
  litrosDisponibles?: number;
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
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  animal: Pick<Animal, 'id' | 'caravana' | 'nombre' | 'categoriaAnimal' | 'estadoReproductivo' | 'activo' | 'estadoAnimal' | 'loteId'> & {
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
  descartadosMayorA?: string;
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

export interface LoteLecheCreateValues {
  codigo: string;
  descripcion: string;
}

export interface LoteLecheEditValues {
  descripcion: string;
  fechaVencimiento: string;
  estado: EstadoLoteLeche;
  grasa: string;
  proteina: string;
  recuentoBacteriano: string;
  recuentoCelulasSomaticas: string;
  temperatura: string;
  observacionesCalidad: string;
  litrosDescartados: string;
  motivoDescarte: MotivoDescarteLeche | '';
  observacionDescarte: string;
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
  litrosTotalesProducidos: number;
  litrosTotales: number;
  litrosDescartados: number;
  litrosNetos: number;
  promedioPorOrdene: number;
  cantidadOrdenes: number;
  mejorRegistro: ProduccionAnimal | null;
  peorRegistro: ProduccionAnimal | null;
  grasaPromedio: number;
  proteinaPromedio: number;
  recuentoBacterianoPromedio: number;
  recuentoCelulasSomaticasPromedio: number;
  temperaturaPromedio: number;
  evolucion: ProduccionEvolucionDiaria[];
}

export interface ProduccionPorLote {
  lote: Pick<Lote, 'id' | 'nombre' | 'descripcion' | 'activo'>;
  litrosTotalesProducidos: number;
  litrosTotales: number;
  litrosDescartados: number;
  litrosNetos: number;
  promedioPorAnimal: number;
  cantidadAnimalesConProduccion: number;
  cantidadOrdenes: number;
  rankingAnimales: Array<{
    animal: ProduccionAnimal['animal'];
    litrosTotales: number;
    litrosDescartados: number;
    litrosNetos: number;
    promedioPorOrdene: number;
  }>;
  animalesBajoRendimiento: Array<{
    animal: ProduccionAnimal['animal'];
    litrosTotales: number;
    litrosDescartados: number;
    litrosNetos: number;
    promedioPorOrdene: number;
  }>;
  grasaPromedio: number;
  proteinaPromedio: number;
  recuentoBacterianoPromedio: number;
  recuentoCelulasSomaticasPromedio: number;
  temperaturaPromedio: number;
  evolucionDiaria: ProduccionEvolucionDiaria[];
}

export interface ProduccionPorLoteLeche {
  loteLeche: LoteLeche & { producciones: ProduccionAnimal[] };
  produccionesAsociadas: ProduccionAnimal[];
  animales: Array<{
    animal: ProduccionAnimal['animal'];
    litrosTotales: number;
    litrosDescartados: number;
    litrosNetos: number;
  }>;
  litrosPorAnimal: Array<{
    animal: ProduccionAnimal['animal'];
    litrosTotales: number;
    litrosDescartados: number;
    litrosNetos: number;
  }>;
  calidad: Pick<
    LoteLeche,
    | 'grasa'
    | 'proteina'
    | 'temperatura'
    | 'recuentoBacteriano'
    | 'recuentoCelulasSomaticas'
    | 'observacionesCalidad'
  >;
  litrosTotales: number;
  litrosDescartados: number;
  litrosNetos: number;
  litrosVendidos: number;
  litrosDisponibles: number;
}
