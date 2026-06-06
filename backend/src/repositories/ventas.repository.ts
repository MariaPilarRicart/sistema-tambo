import { EstadoLoteLeche, Prisma } from '@prisma/client';
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
