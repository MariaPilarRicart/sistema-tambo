import type { MotivoDescarteLeche, Prisma, TurnoOrdene } from '@prisma/client';
import { prisma } from '../config/prisma';

export const produccionAnimalInclude = {
  animal: {
    select: {
      id: true,
      caravana: true,
      nombre: true,
      categoria: true,
      activo: true,
      estadoAnimal: true,
      loteId: true,
      lote: {
        select: {
          id: true,
          nombre: true,
          activo: true,
        },
      },
    },
  },
  usuario: {
    select: {
      id: true,
      nombre: true,
      username: true,
      rol: true,
    },
  },
} satisfies Prisma.ProduccionAnimalInclude;

export type ProduccionAnimalWithRelations = Prisma.ProduccionAnimalGetPayload<{
  include: typeof produccionAnimalInclude;
}>;

export interface ProduccionFilters {
  fechaDesde?: Date;
  fechaHasta?: Date;
  animalId?: number;
  loteId?: number;
  turno?: TurnoOrdene;
}

function buildWhere(filters: ProduccionFilters): Prisma.ProduccionAnimalWhereInput {
  return {
    fechaHora:
      filters.fechaDesde || filters.fechaHasta
        ? {
            gte: filters.fechaDesde,
            lte: filters.fechaHasta,
          }
        : undefined,
    animalId: filters.animalId,
    turno: filters.turno,
    animal: filters.loteId ? { loteId: filters.loteId } : undefined,
  };
}

export function createProduccionAnimal(data: {
  animalId: number;
  fechaHora: Date;
  fecha: Date;
  turno: TurnoOrdene;
  litrosProducidos: Prisma.Decimal | number;
  litrosDescartados: Prisma.Decimal | number;
  motivoDescarte?: MotivoDescarteLeche | null;
  observacionDescarte?: string | null;
  temperaturaTanque?: Prisma.Decimal | number | null;
  grasa?: Prisma.Decimal | number | null;
  proteina?: Prisma.Decimal | number | null;
  recuentoCelulasSomaticas?: number | null;
  recuentoBacteriano?: number | null;
  observacionesCalidad?: string | null;
  usuarioId?: number | null;
}) {
  return prisma.produccionAnimal.create({
    data,
    include: produccionAnimalInclude,
  });
}

export function deleteProduccionAnimal(id: number) {
  return prisma.produccionAnimal.delete({
    where: { id },
    include: produccionAnimalInclude,
  });
}

export function findProduccionAnimalById(id: number) {
  return prisma.produccionAnimal.findUnique({
    where: { id },
    include: produccionAnimalInclude,
  });
}

export function findProduccionesAnimales(filters: ProduccionFilters = {}) {
  return prisma.produccionAnimal.findMany({
    where: buildWhere(filters),
    orderBy: [{ fechaHora: 'desc' }, { id: 'desc' }],
    include: produccionAnimalInclude,
  });
}

export function findProduccionesAnimalesAsc(filters: ProduccionFilters = {}) {
  return prisma.produccionAnimal.findMany({
    where: buildWhere(filters),
    orderBy: [{ fechaHora: 'asc' }, { id: 'asc' }],
    include: produccionAnimalInclude,
  });
}

export function findAnimalForProduccion(id: number) {
  return prisma.animal.findUnique({
    where: { id },
    include: {
      lote: {
        select: {
          id: true,
          nombre: true,
          activo: true,
        },
      },
    },
  });
}

export function findLoteById(id: number) {
  return prisma.lote.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      activo: true,
    },
  });
}

export function findAnimalesProductivos() {
  return prisma.animal.findMany({
    where: {
      activo: true,
      estadoAnimal: 'ACTIVO',
      OR: [
        { categoria: 'VACA' },
        { lote: { nombre: { equals: 'Produccion', mode: 'insensitive' } } },
        { lote: { nombre: { equals: 'Producción', mode: 'insensitive' } } },
        { lote: { nombre: { equals: 'Lecheras', mode: 'insensitive' } } },
      ],
    },
    orderBy: { caravana: 'asc' },
    include: {
      lote: {
        select: {
          id: true,
          nombre: true,
          activo: true,
        },
      },
    },
  });
}
