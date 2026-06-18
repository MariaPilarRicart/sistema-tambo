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

export interface OrdeneDetalle {
  id: number;
  ordeneId: number;
  animalId: number;
  litros: number | string;
  observaciones: string | null;
  animal: Pick<Animal, 'id' | 'caravana' | 'nombre' | 'categoriaAnimal' | 'estadoReproductivo' | 'activo' | 'estadoAnimal' | 'loteId'> & {
    lote: Pick<Lote, 'id' | 'nombre' | 'activo' | 'tipoFuncional'>;
  };
}

export interface Ordene {
  id: number;
  fecha: string;
  turno: TurnoOrdene;
  litrosBuenos: number | string;
  litrosDescartados: number | string;
  observaciones: string | null;
  activo: boolean;
  detalles: OrdeneDetalle[];
  usuario: {
    id: number;
    nombre: string;
    username: string;
    rol: UserRole;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export type ProduccionAnimal = Ordene;

export interface ProduccionFilters {
  fechaDesde: string;
  fechaHasta: string;
  turno: string;
}

export interface OrdeneDetalleFormValues {
  animalId: string;
  litros: string;
  observaciones: string;
}

export interface ProduccionFormValues {
  fecha: string;
  turno: TurnoOrdene;
  litrosBuenos: string;
  litrosDescartados: string;
  observaciones: string;
  detalles: OrdeneDetalleFormValues[];
}

export interface ProduccionEvolucionDiaria {
  fecha: string;
  litrosBuenos: number;
  litrosDescartados: number;
  litrosTotales: number;
  totalIndividualCargado: number;
  cantidadOrdenes: number;
}

export interface ProduccionResumen {
  totalLitrosProducidos: number;
  totalLitrosBuenos: number;
  totalLitrosDescartados: number;
  totalLitrosNetos: number;
  totalLitros: number;
  promedioPorOrdene: number;
  cantidadOrdenes: number;
  cantidadRegistros: number;
  cantidadAnimalesRegistrados: number;
  totalIndividualCargado: number;
  alertaDescarte: boolean;
  evolucionDiaria: ProduccionEvolucionDiaria[];
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

export interface ProduccionPorAnimal {
  animal: Animal;
  historial: Ordene[];
  litrosTotalesProducidos: number;
  litrosTotales: number;
  litrosDescartados: number;
  litrosNetos: number;
  promedioPorOrdene: number;
  cantidadOrdenes: number;
  mejorRegistro: Ordene | null;
  peorRegistro: Ordene | null;
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
    animal: OrdeneDetalle['animal'];
    litrosTotales: number;
    litrosDescartados: number;
    litrosNetos: number;
    promedioPorOrdene: number;
  }>;
  animalesBajoRendimiento: Array<{
    animal: OrdeneDetalle['animal'];
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
  loteLeche: LoteLeche & { producciones: Ordene[] };
  produccionesAsociadas: Ordene[];
  animales: Array<{
    animal: OrdeneDetalle['animal'];
    litrosTotales: number;
    litrosDescartados: number;
    litrosNetos: number;
  }>;
  litrosPorAnimal: Array<{
    animal: OrdeneDetalle['animal'];
    litrosTotales: number;
    litrosDescartados: number;
    litrosNetos: number;
  }>;
  calidad: Pick<LoteLeche, 'grasa' | 'proteina' | 'temperatura' | 'recuentoBacteriano' | 'recuentoCelulasSomaticas' | 'observacionesCalidad'>;
  litrosTotales: number;
  litrosDescartados: number;
  litrosNetos: number;
  litrosVendidos: number;
  litrosDisponibles: number;
}
