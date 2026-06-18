import { EstadoEntregaLeche, EstadoLoteLeche, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const ventaInclude = {
  cliente: true,
  usuario: { select: { id: true, nombre: true, username: true, rol: true } },
  detalles: {
    include: {
      loteLeche: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.VentaInclude;

export type VentaWithRelations = Prisma.VentaGetPayload<{ include: typeof ventaInclude }>;

export interface VentaFilters {
  clienteId?: number;
  clienteSearch?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  factura?: string;
}

function buildWhere(filters: VentaFilters): Prisma.VentaWhereInput {
  return {
    clienteId: filters.clienteId,
    cliente: filters.clienteSearch
      ? {
          OR: [
            { cuit: { contains: filters.clienteSearch, mode: 'insensitive' } },
            { razonSocial: { contains: filters.clienteSearch, mode: 'insensitive' } },
          ],
        }
      : undefined,
    numeroFactura: filters.factura ? { contains: filters.factura, mode: 'insensitive' } : undefined,
    fechaVenta:
      filters.fechaDesde || filters.fechaHasta
        ? {
            gte: filters.fechaDesde,
            lte: filters.fechaHasta,
          }
        : undefined,
  };
}

export function findVentas(filters: VentaFilters = {}) {
  return prisma.venta.findMany({
    where: buildWhere(filters),
    orderBy: [{ fechaVenta: 'desc' }, { id: 'desc' }],
    include: ventaInclude,
  });
}

export function findVentaById(id: number) {
  return prisma.venta.findUnique({
    where: { id },
    include: ventaInclude,
  });
}

export function findVentaByFactura(numeroFactura: string) {
  return prisma.venta.findUnique({ where: { numeroFactura } });
}

export function findClienteForVenta(id: number) {
  return prisma.cliente.findUnique({ where: { id } });
}

export function findLotesLecheForVenta(ids: number[]) {
  return prisma.loteLeche.findMany({
    where: { id: { in: ids } },
  });
}

export function findVentaDetallesByLoteIds(loteLecheIds: number[]) {
  return prisma.ventaDetalle.groupBy({
    by: ['loteLecheId'],
    where: { loteLecheId: { in: loteLecheIds } },
    _sum: { litrosVendidos: true },
  });
}

export function findLotesLecheConVentas() {
  return prisma.loteLeche.findMany({
    orderBy: [{ fechaProduccion: 'desc' }, { codigo: 'asc' }],
    include: {
      ventaDetalles: {
        include: {
          venta: {
            include: {
              cliente: true,
              usuario: { select: { id: true, nombre: true, username: true, rol: true } },
            },
          },
        },
      },
    },
  });
}

export async function createVentaConDetalles(data: {
  clienteId: number;
  numeroFactura: string;
  fechaVenta: Date;
  precioPorLitro: Prisma.Decimal;
  totalLitros: Prisma.Decimal;
  precioTotal: Prisma.Decimal;
  observaciones?: string | null;
  usuarioId: number;
  detalles: Array<{
    loteLecheId: number;
    litrosVendidos: Prisma.Decimal;
    precioUnitario: Prisma.Decimal;
    subtotal: Prisma.Decimal;
  }>;
  estadosLotes: Array<{ id: number; estado: EstadoLoteLeche; fechaVenta?: Date | null }>;
}) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.create({
      data: {
        clienteId: data.clienteId,
        numeroFactura: data.numeroFactura,
        fechaVenta: data.fechaVenta,
        precioPorLitro: data.precioPorLitro,
        totalLitros: data.totalLitros,
        precioTotal: data.precioTotal,
        observaciones: data.observaciones,
        usuarioId: data.usuarioId,
        detalles: { create: data.detalles },
      },
      include: ventaInclude,
    });

    await Promise.all(
      data.estadosLotes.map((lote) =>
        tx.loteLeche.update({
          where: { id: lote.id },
          data: { estado: lote.estado, fechaVenta: lote.fechaVenta },
        }),
      ),
    );

    return venta;
  });
}

export const entregaLecheInclude = {
  cliente: true,
  usuario: { select: { id: true, nombre: true, username: true, rol: true } },
  liquidacion: {
    select: {
      id: true,
      numero: true,
      mes: true,
      anio: true,
    },
  },
  ordenes: {
    include: {
      ordene: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.EntregaLecheInclude;

export const liquidacionLecheInclude = {
  cliente: true,
  usuario: { select: { id: true, nombre: true, username: true, rol: true } },
  entregas: {
    include: entregaLecheInclude,
    orderBy: [{ fechaRetiro: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.LiquidacionLecheInclude;

export type EntregaLecheWithRelations = Prisma.EntregaLecheGetPayload<{ include: typeof entregaLecheInclude }>;
export type LiquidacionLecheWithRelations = Prisma.LiquidacionLecheGetPayload<{ include: typeof liquidacionLecheInclude }>;

export interface EntregaLecheFilters {
  clienteId?: number;
  fechaDesde?: Date;
  fechaHasta?: Date;
  estado?: EstadoEntregaLeche;
}

export interface LiquidacionLecheFilters {
  clienteId?: number;
  mes?: number;
  anio?: number;
}

function buildEntregaWhere(filters: EntregaLecheFilters): Prisma.EntregaLecheWhereInput {
  return {
    clienteId: filters.clienteId,
    estado: filters.estado,
    fechaRetiro:
      filters.fechaDesde || filters.fechaHasta
        ? {
            gte: filters.fechaDesde,
            lte: filters.fechaHasta,
          }
        : undefined,
  };
}

function buildLiquidacionWhere(filters: LiquidacionLecheFilters): Prisma.LiquidacionLecheWhereInput {
  return {
    clienteId: filters.clienteId,
    mes: filters.mes,
    anio: filters.anio,
  };
}

export function findEntregasLeche(filters: EntregaLecheFilters = {}) {
  return prisma.entregaLeche.findMany({
    where: buildEntregaWhere(filters),
    orderBy: [{ fechaRetiro: 'desc' }, { id: 'desc' }],
    include: entregaLecheInclude,
  });
}

export function findEntregaLecheById(id: number) {
  return prisma.entregaLeche.findUnique({
    where: { id },
    include: entregaLecheInclude,
  });
}

export function findOrdenesDisponiblesParaEntrega() {
  return prisma.ordene.findMany({
    where: {
      activo: true,
      litrosBuenos: { gt: 0 },
      entregas: {
        none: {
          entregaLeche: {
            estado: { not: EstadoEntregaLeche.ANULADA },
          },
        },
      },
    },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  });
}

export function findOrdenesByIds(ids: number[]) {
  return prisma.ordene.findMany({
    where: {
      id: { in: ids },
      activo: true,
    },
  });
}

export function findOrdenesAsignadas(ids: number[], excludeEntregaId?: number) {
  return prisma.entregaLecheOrdene.findMany({
    where: {
      ordeneId: { in: ids },
      entregaLeche: {
        estado: { not: EstadoEntregaLeche.ANULADA },
        id: excludeEntregaId ? { not: excludeEntregaId } : undefined,
      },
    },
    include: {
      entregaLeche: {
        include: {
          cliente: true,
        },
      },
    },
  });
}

export function createEntregaLeche(data: {
  clienteId: number;
  fechaRetiro: Date;
  observacion?: string | null;
  usuarioId?: number;
  ordenes: Array<{ ordeneId: number; litrosEntregados: Prisma.Decimal }>;
}) {
  return prisma.entregaLeche.create({
    data: {
      clienteId: data.clienteId,
      fechaRetiro: data.fechaRetiro,
      observacion: data.observacion,
      usuarioId: data.usuarioId,
      ordenes: { create: data.ordenes },
    },
    include: entregaLecheInclude,
  });
}

export async function updateEntregaLeche(id: number, data: {
  clienteId: number;
  fechaRetiro: Date;
  observacion?: string | null;
  ordenes: Array<{ ordeneId: number; litrosEntregados: Prisma.Decimal }>;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.entregaLecheOrdene.deleteMany({ where: { entregaLecheId: id } });
    return tx.entregaLeche.update({
      where: { id },
      data: {
        clienteId: data.clienteId,
        fechaRetiro: data.fechaRetiro,
        observacion: data.observacion,
        ordenes: { create: data.ordenes },
      },
      include: entregaLecheInclude,
    });
  });
}

export function deleteEntregaLeche(id: number) {
  return prisma.$transaction(async (tx) => {
    await tx.entregaLecheOrdene.deleteMany({ where: { entregaLecheId: id } });
    return tx.entregaLeche.delete({
      where: { id },
      include: entregaLecheInclude,
    });
  });
}

export function findLiquidacionesLeche(filters: LiquidacionLecheFilters = {}) {
  return prisma.liquidacionLeche.findMany({
    where: buildLiquidacionWhere(filters),
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { id: 'desc' }],
    include: liquidacionLecheInclude,
  });
}

export function findLiquidacionLecheByPeriodo(clienteId: number, mes: number, anio: number) {
  return prisma.liquidacionLeche.findUnique({
    where: {
      clienteId_mes_anio: {
        clienteId,
        mes,
        anio,
      },
    },
    include: liquidacionLecheInclude,
  });
}

export function findEntregasPendientesPeriodo(clienteId: number, desde: Date, hasta: Date) {
  return prisma.entregaLeche.findMany({
    where: {
      clienteId,
      estado: EstadoEntregaLeche.PENDIENTE,
      fechaRetiro: {
        gte: desde,
        lte: hasta,
      },
    },
    include: entregaLecheInclude,
    orderBy: [{ fechaRetiro: 'asc' }, { id: 'asc' }],
  });
}

export async function createLiquidacionLeche(data: {
  clienteId: number;
  mes: number;
  anio: number;
  numero: string;
  fechaLiquidacion: Date;
  precioLitro: Prisma.Decimal;
  litrosLiquidados: Prisma.Decimal;
  importeTotal: Prisma.Decimal;
  observacion?: string | null;
  usuarioId?: number;
  entregaIds: number[];
}) {
  return prisma.$transaction(async (tx) => {
    const liquidacion = await tx.liquidacionLeche.create({
      data: {
        clienteId: data.clienteId,
        mes: data.mes,
        anio: data.anio,
        numero: data.numero,
        fechaLiquidacion: data.fechaLiquidacion,
        precioLitro: data.precioLitro,
        litrosLiquidados: data.litrosLiquidados,
        importeTotal: data.importeTotal,
        observacion: data.observacion,
        usuarioId: data.usuarioId,
      },
    });

    await tx.entregaLeche.updateMany({
      where: { id: { in: data.entregaIds } },
      data: {
        estado: EstadoEntregaLeche.LIQUIDADA,
        liquidacionId: liquidacion.id,
      },
    });

    return tx.liquidacionLeche.findUniqueOrThrow({
      where: { id: liquidacion.id },
      include: liquidacionLecheInclude,
    });
  });
}
