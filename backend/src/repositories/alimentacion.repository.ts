import type {
  CategoriaAnimal,
  Prisma,
  TipoAlimento,
  TipoCalculoAlimentacion,
  TipoMovimientoStockAlimentacion,
  UnidadAlimento,
} from '@prisma/client';
import { prisma } from '../config/prisma';

export const alimentoSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  tipoAlimento: true,
  unidadMedida: true,
  stockActual: true,
  stockMinimo: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
};

export const reglaInclude = {
  detalles: {
    include: {
      alimento: {
        select: alimentoSelect,
      },
    },
    orderBy: { id: 'asc' as const },
  },
};

export const movimientoInclude = {
  insumo: {
    select: alimentoSelect,
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

export const registroInclude = {
  lote: {
    select: {
      id: true,
      nombre: true,
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
  detalles: {
    include: {
      insumo: {
        select: alimentoSelect,
      },
    },
    orderBy: { id: 'asc' as const },
  },
};

export function findLoteWithAnimales(loteId: number) {
  return prisma.lote.findUnique({
    where: { id: loteId },
    select: {
      id: true,
      nombre: true,
      activo: true,
      animales: {
        where: { activo: true, estadoAnimal: 'ACTIVO' },
        select: {
          id: true,
          categoriaAnimal: true,
        },
      },
    },
  });
}

export function findActiveRulesByCategoria(categoriaAnimal: CategoriaAnimal) {
  return prisma.reglaAlimentacion.findMany({
    where: {
      categoriaAnimal,
      activo: true,
      detalles: { some: { alimento: { activo: true } } },
    },
    orderBy: [{ nombre: 'asc' }],
    include: reglaInclude,
  });
}

export function findReglasAlimentacion() {
  return prisma.reglaAlimentacion.findMany({
    orderBy: [{ categoriaAnimal: 'asc' }, { nombre: 'asc' }],
    include: reglaInclude,
  });
}

export function findReglaAlimentacionById(id: number) {
  return prisma.reglaAlimentacion.findUnique({
    where: { id },
    include: reglaInclude,
  });
}

export function createReglaAlimentacion(data: {
  nombre: string;
  categoriaAnimal: CategoriaAnimal;
  activo?: boolean;
  observaciones?: string | null;
  detalles: Array<{
    alimentoId: number;
    tipoCalculo: TipoCalculoAlimentacion;
    unidad: UnidadAlimento;
    cantidadMinima?: number | null;
    cantidadMaxima?: number | null;
    animalesBase?: number | null;
    rollosBase?: number | null;
    duracionDias?: number | null;
    obligatorio?: boolean;
    observaciones?: string | null;
  }>;
}) {
  return prisma.reglaAlimentacion.create({
    data: {
      nombre: data.nombre,
      categoriaAnimal: data.categoriaAnimal,
      activo: data.activo,
      observaciones: data.observaciones,
      detalles: { create: data.detalles },
    },
    include: reglaInclude,
  });
}

export function updateReglaAlimentacion(
  id: number,
  data: {
    nombre: string;
    categoriaAnimal: CategoriaAnimal;
    activo: boolean;
    observaciones: string | null;
    detalles: Array<{
      alimentoId: number;
      tipoCalculo: TipoCalculoAlimentacion;
      unidad: UnidadAlimento;
      cantidadMinima?: number | null;
      cantidadMaxima?: number | null;
      animalesBase?: number | null;
      rollosBase?: number | null;
      duracionDias?: number | null;
      obligatorio?: boolean;
      observaciones?: string | null;
    }>;
  },
) {
  return prisma.$transaction(async (tx) => {
    await tx.detalleReglaAlimentacion.deleteMany({ where: { reglaAlimentacionId: id } });
    return tx.reglaAlimentacion.update({
      where: { id },
      data: {
        nombre: data.nombre,
        categoriaAnimal: data.categoriaAnimal,
        activo: data.activo,
        observaciones: data.observaciones,
        detalles: { create: data.detalles },
      },
      include: reglaInclude,
    });
  });
}

export function findAlimentosAlimentacion(where: Prisma.InsumoAlimentacionWhereInput = {}) {
  return prisma.insumoAlimentacion.findMany({
    where,
    orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    select: alimentoSelect,
  });
}

export function findAlimentoById(id: number) {
  return prisma.insumoAlimentacion.findUnique({
    where: { id },
    select: alimentoSelect,
  });
}

export function findAlimentoByNombre(nombre: string) {
  return prisma.insumoAlimentacion.findUnique({
    where: { nombre },
  });
}

export function createAlimento(data: {
  nombre: string;
  descripcion?: string | null;
  tipoAlimento: TipoAlimento;
  unidadMedida: string;
  stockActual?: number;
  stockMinimo?: number;
  activo?: boolean;
}) {
  return prisma.insumoAlimentacion.create({
    data,
    select: alimentoSelect,
  });
}

export function updateAlimento(id: number, data: Prisma.InsumoAlimentacionUpdateInput) {
  return prisma.insumoAlimentacion.update({
    where: { id },
    data,
    select: alimentoSelect,
  });
}

export function findMovimientosStockAlimentacion(where: Prisma.MovimientoStockAlimentacionWhereInput = {}) {
  return prisma.movimientoStockAlimentacion.findMany({
    where,
    take: 200,
    orderBy: { fecha: 'desc' },
    include: movimientoInclude,
  });
}

export function findHistorialAlimentacion(where: Prisma.RegistroAlimentacionWhereInput = {}) {
  return prisma.registroAlimentacion.findMany({
    where,
    take: 200,
    orderBy: { fecha: 'desc' },
    include: registroInclude,
  });
}

export async function createMovimientoStockManual(data: {
  alimentoId: number;
  tipoMovimiento: TipoMovimientoStockAlimentacion;
  fecha: Date;
  cantidad: number;
  observaciones?: string | null;
  usuarioId?: number | null;
}) {
  return prisma.$transaction(async (tx) => {
    const alimento = await tx.insumoAlimentacion.findUnique({ where: { id: data.alimentoId } });
    if (!alimento) return null;
    if (!alimento.activo) return { error: 'INACTIVE' as const };

    const nextStock =
      data.tipoMovimiento === 'ENTRADA'
        ? alimento.stockActual + data.cantidad
        : alimento.stockActual - data.cantidad;

    if (nextStock < 0) return { error: 'INSUFFICIENT_STOCK' as const, alimento };

    const movimiento = await tx.movimientoStockAlimentacion.create({
      data: {
        insumoId: data.alimentoId,
        tipoMovimiento: data.tipoMovimiento,
        fecha: data.fecha,
        cantidad: data.cantidad,
        observaciones: data.observaciones,
        usuarioId: data.usuarioId,
      },
    });

    await tx.insumoAlimentacion.update({
      where: { id: data.alimentoId },
      data: { stockActual: nextStock },
    });

    return tx.movimientoStockAlimentacion.findUnique({
      where: { id: movimiento.id },
      include: movimientoInclude,
    });
  });
}

export async function updateAlimentoWithMovimiento(data: {
  alimentoId: number;
  update: Prisma.InsumoAlimentacionUpdateInput;
  fecha: Date;
  observaciones?: string | null;
  usuarioId?: number | null;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.insumoAlimentacion.findUnique({ where: { id: data.alimentoId } });
    if (!existing) return null;

    const updated = await tx.insumoAlimentacion.update({
      where: { id: data.alimentoId },
      data: data.update,
      select: alimentoSelect,
    });

    await tx.movimientoStockAlimentacion.create({
      data: {
        insumoId: data.alimentoId,
        tipoMovimiento: 'MODIFICACION',
        fecha: data.fecha,
        cantidad: 0,
        observaciones: data.observaciones ?? 'Modificacion de datos del alimento.',
        usuarioId: data.usuarioId,
      },
    });

    return updated;
  });
}

export async function createRegistroAlimentacionTransaccional(data: {
  fecha: Date;
  loteId: number;
  categoriaAnimal: CategoriaAnimal;
  cantidadAnimales: number;
  observaciones?: string | null;
  usuarioId?: number | null;
  detalles: Array<{
    alimentoId: number;
    cantidadReal: number;
    cantidadSugeridaMinima?: number | null;
    cantidadSugeridaMaxima?: number | null;
    unidad: string;
    observaciones?: string | null;
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    const alimentoIds = data.detalles.map((detalle) => detalle.alimentoId);
    const alimentos = await tx.insumoAlimentacion.findMany({ where: { id: { in: alimentoIds } } });
    const byId = new Map(alimentos.map((alimento) => [alimento.id, alimento]));

    for (const detalle of data.detalles) {
      const alimento = byId.get(detalle.alimentoId);
      if (!alimento) return { error: 'ALIMENTO_NOT_FOUND' as const, detalle };
      if (!alimento.activo) return { error: 'ALIMENTO_INACTIVE' as const, alimento };
      if (detalle.cantidadReal > alimento.stockActual) {
        return { error: 'INSUFFICIENT_STOCK' as const, alimento, solicitado: detalle.cantidadReal };
      }
    }

    const totalCantidad = data.detalles.reduce((sum, detalle) => sum + detalle.cantidadReal, 0);
    const registro = await tx.registroAlimentacion.create({
      data: {
        fecha: data.fecha,
        loteId: data.loteId,
        categoriaAnimal: data.categoriaAnimal,
        cantidadAnimales: data.cantidadAnimales,
        cantidadKg: totalCantidad,
        observaciones: data.observaciones,
        usuarioId: data.usuarioId,
      },
    });

    for (const detalle of data.detalles) {
      await tx.detalleAlimentacion.create({
        data: {
          alimentacionId: registro.id,
          insumoId: detalle.alimentoId,
          cantidad: detalle.cantidadReal,
          unidad: detalle.unidad,
          cantidadSugeridaMinima: detalle.cantidadSugeridaMinima,
          cantidadSugeridaMaxima: detalle.cantidadSugeridaMaxima,
          observaciones: detalle.observaciones,
        },
      });

      await tx.insumoAlimentacion.update({
        where: { id: detalle.alimentoId },
        data: { stockActual: { decrement: detalle.cantidadReal } },
      });

      await tx.movimientoStockAlimentacion.create({
        data: {
          insumoId: detalle.alimentoId,
          alimentacionId: registro.id,
          tipoMovimiento: 'CONSUMO',
          fecha: data.fecha,
          cantidad: detalle.cantidadReal,
          observaciones: detalle.observaciones ?? data.observaciones,
          usuarioId: data.usuarioId,
        },
      });
    }

    return tx.registroAlimentacion.findUnique({
      where: { id: registro.id },
      include: registroInclude,
    });
  });
}

export function countRegistrosHoy(desde: Date, hasta: Date) {
  return prisma.registroAlimentacion.count({
    where: { fecha: { gte: desde, lte: hasta } },
  });
}

export function countLotesAlimentadosHoy(desde: Date, hasta: Date) {
  return prisma.registroAlimentacion.findMany({
    where: { fecha: { gte: desde, lte: hasta }, loteId: { not: null } },
    distinct: ['loteId'],
    select: { loteId: true },
  });
}
