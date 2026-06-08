import { Prisma, type EstadoLoteLeche, type MotivoDescarteLeche, type TurnoOrdene } from '@prisma/client';
import { prisma } from '../config/prisma';

export const produccionAnimalInclude = {
  animal: {
    select: {
      id: true,
      caravana: true,
      nombre: true,
      categoriaAnimal: true,
      estadoReproductivo: true,
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
  loteLeche: true,
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

export type LoteLecheWithProducciones = Prisma.LoteLecheGetPayload<{
  include: {
    producciones: {
      include: typeof produccionAnimalInclude;
    };
    ventaDetalles: {
      include: {
        venta: {
          include: {
            cliente: true;
          };
        };
      };
    };
  };
}>;

export interface ProduccionFilters {
  fechaDesde?: Date;
  fechaHasta?: Date;
  animalId?: number;
  loteId?: number;
  loteLecheId?: number;
  turno?: TurnoOrdene;
  descartadosMayorA?: number;
  activo?: boolean;
}

function buildWhere(filters: ProduccionFilters): Prisma.ProduccionAnimalWhereInput {
  return {
    activo: filters.activo,
    fechaHora:
      filters.fechaDesde || filters.fechaHasta
        ? {
            gte: filters.fechaDesde,
            lte: filters.fechaHasta,
          }
        : undefined,
    animalId: filters.animalId,
    loteLecheId: filters.loteLecheId,
    litrosDescartados: filters.descartadosMayorA !== undefined ? { gt: filters.descartadosMayorA } : undefined,
    turno: filters.turno,
    animal: filters.loteId ? { loteId: filters.loteId } : undefined,
  };
}

async function recalculateLoteLecheTotals(tx: Prisma.TransactionClient, loteLecheId: number) {
  const [loteLeche, totals] = await Promise.all([
    tx.loteLeche.findUnique({ where: { id: loteLecheId }, select: { litrosDescartados: true } }),
    tx.produccionAnimal.aggregate({
      where: { loteLecheId, activo: true },
      _sum: {
        litrosProducidos: true,
      },
    }),
  ]);

  const litrosTotales = totals._sum.litrosProducidos ?? 0;
  const litrosDescartados = loteLeche?.litrosDescartados ?? 0;
  const litrosNetos = new Prisma.Decimal(litrosTotales).minus(litrosDescartados);

  return tx.loteLeche.update({
    where: { id: loteLecheId },
    data: {
      litrosTotales,
      litrosNetos,
    },
  });
}

export async function createProduccionAnimal(data: {
  animalId: number;
  loteLecheId: number;
  usuarioId: number;
  fechaHora: Date;
  turno: TurnoOrdene;
  litrosProducidos: Prisma.Decimal | number;
  litrosDescartados: Prisma.Decimal | number;
  motivoDescarte?: MotivoDescarteLeche | null;
  observacionDescarte?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const produccion = await tx.produccionAnimal.create({
      data,
      include: produccionAnimalInclude,
    });

    await recalculateLoteLecheTotals(tx, data.loteLecheId);
    return produccion;
  });
}

export async function deactivateProduccionAnimal(id: number) {
  return prisma.$transaction(async (tx) => {
    const deactivated = await tx.produccionAnimal.update({
      where: { id },
      data: { activo: false },
      include: produccionAnimalInclude,
    });

    await recalculateLoteLecheTotals(tx, deactivated.loteLecheId);
    return deactivated;
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

export function findLoteLecheById(id: number) {
  return prisma.loteLeche.findUnique({
    where: { id },
  });
}

export function findLoteLecheWithProducciones(id: number) {
  return prisma.loteLeche.findUnique({
    where: { id },
    include: {
      producciones: {
        where: { activo: true },
        include: produccionAnimalInclude,
        orderBy: [{ fechaHora: 'asc' }, { id: 'asc' }],
      },
      ventaDetalles: {
        include: {
          venta: {
            include: {
              cliente: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  });
}

export function findLotesLeche() {
  return prisma.loteLeche.findMany({
    orderBy: [{ estado: 'asc' }, { fechaProduccion: 'desc' }, { id: 'desc' }],
    include: {
      ventaDetalles: {
        select: {
          litrosVendidos: true,
        },
      },
    },
  });
}

export function findLotesLecheCodigos() {
  return prisma.loteLeche.findMany({
    select: { codigo: true },
  });
}

export function createLoteLeche(data: Prisma.LoteLecheCreateInput) {
  return prisma.loteLeche.create({ data });
}

export function updateLoteLeche(id: number, data: Prisma.LoteLecheUpdateInput) {
  return prisma.loteLeche.update({
    where: { id },
    data,
  });
}

export function deactivateLoteLeche(id: number) {
  return prisma.loteLeche.update({
    where: { id },
    data: { estado: 'INACTIVO' },
  });
}

export function countProduccionesByLoteLeche(loteLecheId: number) {
  return prisma.produccionAnimal.count({
    where: { loteLecheId, activo: true },
  });
}

export function findAnimalesProductivos() {
  return prisma.animal.findMany({
    where: {
      activo: true,
      estadoAnimal: 'ACTIVO',
      categoriaAnimal: 'VACA_PRODUCCION',
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

export function findLotesLecheByEstado(estado: EstadoLoteLeche) {
  return prisma.loteLeche.findMany({
    where: { estado },
    orderBy: [{ fechaProduccion: 'desc' }, { codigo: 'asc' }],
  });
}
