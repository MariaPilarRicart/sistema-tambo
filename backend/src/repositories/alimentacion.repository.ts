import { CategoriaAnimal, TipoMovimientoStockAlimentacion } from '@prisma/client';
import { prisma } from '../config/prisma';

const racionSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  categoriaAnimal: true,
  activa: true,
  createdAt: true,
  updatedAt: true,
};

const registroInclude = {
  racion: {
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      activa: true,
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
};

const insumoSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  unidadMedida: true,
  stockActual: true,
  stockMinimo: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
};

const movimientoStockInclude = {
  insumo: {
    select: {
      id: true,
      nombre: true,
      unidadMedida: true,
      stockActual: true,
      stockMinimo: true,
      activo: true,
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
};

export function findRaciones() {
  return prisma.racion.findMany({
    orderBy: { id: 'asc' },
    select: racionSelect,
  });
}

export function findRacionById(id: number) {
  return prisma.racion.findUnique({
    where: { id },
    select: racionSelect,
  });
}

export function findRacionByNombre(nombre: string) {
  return prisma.racion.findUnique({
    where: { nombre },
  });
}

export function createRacion(data: { nombre: string; descripcion?: string | null; categoriaAnimal?: CategoriaAnimal | null; activa?: boolean }) {
  return prisma.racion.create({
    data,
    select: racionSelect,
  });
}

export function updateRacion(
  id: number,
  data: Partial<{
    nombre: string;
    descripcion: string | null;
    categoriaAnimal: CategoriaAnimal | null;
    activa: boolean;
  }>,
) {
  return prisma.racion.update({
    where: { id },
    data,
    select: racionSelect,
  });
}

export function deactivateRacion(id: number) {
  return prisma.racion.update({
    where: { id },
    data: { activa: false },
    select: racionSelect,
  });
}

export function findActiveRacion(id: number) {
  return prisma.racion.findFirst({
    where: {
      id,
      activa: true,
    },
  });
}

export function createRegistroAlimentacion(data: {
  fecha: Date;
  categoriaAnimal: CategoriaAnimal;
  racionId: number;
  cantidadKg: number;
  observaciones?: string | null;
  usuarioId?: number | null;
}) {
  return prisma.registroAlimentacion.create({
    data,
    include: registroInclude,
  });
}

export function findRegistrosAlimentacion() {
  return prisma.registroAlimentacion.findMany({
    orderBy: { fecha: 'desc' },
    include: registroInclude,
  });
}

export function countRacionesActivas() {
  return prisma.racion.count({
    where: { activa: true },
  });
}

export function countRegistros(where?: { fecha?: { gte?: Date; lte?: Date } }) {
  return prisma.registroAlimentacion.count({ where });
}

export function aggregateTotalKg() {
  return prisma.registroAlimentacion.aggregate({
    _sum: { cantidadKg: true },
  });
}

export function groupAlimentacionByLote() {
  return prisma.registroAlimentacion.groupBy({
    by: ['categoriaAnimal'],
    _sum: { cantidadKg: true },
    orderBy: { categoriaAnimal: 'asc' },
  });
}

export function groupAlimentacionByRacion() {
  return prisma.registroAlimentacion.groupBy({
    by: ['racionId'],
    _sum: { cantidadKg: true },
    orderBy: { racionId: 'asc' },
  });
}

export function findRacionesByIds(ids: number[]) {
  return prisma.racion.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
  });
}

export function countDistinctLotesAlimentados() {
  return prisma.registroAlimentacion.findMany({
    distinct: ['categoriaAnimal'],
    select: { categoriaAnimal: true },
  });
}

export function findUltimosRegistrosAlimentacion() {
  return prisma.registroAlimentacion.findMany({
    take: 8,
    orderBy: { fecha: 'desc' },
    include: registroInclude,
  });
}

export function findInsumosAlimentacion() {
  return prisma.insumoAlimentacion.findMany({
    orderBy: { id: 'asc' },
    select: insumoSelect,
  });
}

export function findInsumoAlimentacionById(id: number) {
  return prisma.insumoAlimentacion.findUnique({
    where: { id },
    select: insumoSelect,
  });
}

export function findInsumoAlimentacionByNombre(nombre: string) {
  return prisma.insumoAlimentacion.findUnique({
    where: { nombre },
  });
}

export function createInsumoAlimentacion(data: {
  nombre: string;
  descripcion?: string | null;
  unidadMedida: string;
  stockMinimo?: number;
  activo?: boolean;
}) {
  return prisma.insumoAlimentacion.create({
    data,
    select: insumoSelect,
  });
}

export function updateInsumoAlimentacion(
  id: number,
  data: Partial<{
    nombre: string;
    descripcion: string | null;
    unidadMedida: string;
    stockMinimo: number;
    activo: boolean;
  }>,
) {
  return prisma.insumoAlimentacion.update({
    where: { id },
    data,
    select: insumoSelect,
  });
}

export function deactivateInsumoAlimentacion(id: number) {
  return prisma.insumoAlimentacion.update({
    where: { id },
    data: { activo: false },
    select: insumoSelect,
  });
}

export function findMovimientosStockAlimentacion() {
  return prisma.movimientoStockAlimentacion.findMany({
    orderBy: { fecha: 'desc' },
    include: movimientoStockInclude,
  });
}

export async function createMovimientoStockAlimentacion(data: {
  insumoId: number;
  tipoMovimiento: TipoMovimientoStockAlimentacion;
  fecha: Date;
  cantidad: number;
  observaciones?: string | null;
  usuarioId?: number | null;
}) {
  return prisma.$transaction(async (transaction) => {
    const insumo = await transaction.insumoAlimentacion.findUnique({
      where: { id: data.insumoId },
    });

    if (!insumo) return null;
    if (!insumo.activo) return { error: 'INACTIVE' as const };
    if (data.tipoMovimiento === TipoMovimientoStockAlimentacion.CONSUMO && insumo.stockActual < data.cantidad) {
      return { error: 'INSUFFICIENT_STOCK' as const };
    }

    const nextStock =
      data.tipoMovimiento === TipoMovimientoStockAlimentacion.ENTRADA
        ? insumo.stockActual + data.cantidad
        : data.tipoMovimiento === TipoMovimientoStockAlimentacion.CONSUMO
          ? insumo.stockActual - data.cantidad
          : data.cantidad;

    const movimiento = await transaction.movimientoStockAlimentacion.create({
      data,
      include: movimientoStockInclude,
    });

    await transaction.insumoAlimentacion.update({
      where: { id: data.insumoId },
      data: { stockActual: nextStock },
    });

    return transaction.movimientoStockAlimentacion.findUnique({
      where: { id: movimiento.id },
      include: movimientoStockInclude,
    });
  });
}

export function countInsumosActivos() {
  return prisma.insumoAlimentacion.count({
    where: { activo: true },
  });
}

export function findInsumosBajoStock() {
  return prisma.insumoAlimentacion.findMany({
    where: {
      activo: true,
      stockActual: { lte: prisma.insumoAlimentacion.fields.stockMinimo },
    },
    orderBy: { nombre: 'asc' },
    select: insumoSelect,
  });
}

export function countMovimientosStock(where?: { fecha?: { gte?: Date; lte?: Date } }) {
  return prisma.movimientoStockAlimentacion.count({ where });
}

export function findUltimosMovimientosStockAlimentacion() {
  return prisma.movimientoStockAlimentacion.findMany({
    take: 8,
    orderBy: { fecha: 'desc' },
    include: movimientoStockInclude,
  });
}

export function findStockPorInsumo() {
  return prisma.insumoAlimentacion.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
    select: insumoSelect,
  });
}
