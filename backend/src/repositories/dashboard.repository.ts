import { EstadoTarea, Prisma, TipoEvento, TipoTarea } from '@prisma/client';
import { prisma } from '../config/prisma';

export function countAnimales(where?: Prisma.AnimalWhereInput) {
  return prisma.animal.count({ where });
}

export function groupAnimalesByEstadoAnimal() {
  return prisma.animal.groupBy({
    by: ['estadoAnimal'],
    _count: { _all: true },
    orderBy: { estadoAnimal: 'asc' },
  });
}

export function groupAnimalesByEstadoReproductivo() {
  return prisma.animal.groupBy({
    by: ['estadoReproductivo'],
    _count: { _all: true },
    orderBy: { estadoReproductivo: 'asc' },
  });
}

export function groupAnimalesByCategoria() {
  return prisma.animal.groupBy({
    by: ['categoriaAnimal'],
    _count: { _all: true },
    orderBy: { categoriaAnimal: 'asc' },
  });
}

export function groupAnimalesByLote() {
  return prisma.lote.findMany({
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      _count: {
        select: {
          animales: true,
        },
      },
    },
  });
}

export function countTareas(where: {
  estado?: EstadoTarea;
  tipo?: TipoTarea;
  tipoSanitario?: Prisma.StringNullableFilter | string | null;
  fechaProgramada?: {
    lt?: Date;
    lte?: Date;
    gt?: Date;
    gte?: Date;
  };
}) {
  return prisma.agendaTarea.count({ where });
}

export function findProduccionesByDateRange(fechaDesde: Date, fechaHasta: Date) {
  return prisma.produccionAnimal.findMany({
    where: { fechaHora: { gte: fechaDesde, lte: fechaHasta } },
    orderBy: { fechaHora: 'asc' },
    select: {
      id: true,
      animalId: true,
      fechaHora: true,
      turno: true,
      litrosProducidos: true,
      litrosDescartados: true,
      loteLeche: {
        select: {
          id: true,
          codigo: true,
          fechaProduccion: true,
          litrosTotales: true,
          litrosNetos: true,
          litrosDescartados: true,
        },
      },
    },
  });
}

export function findLotesLecheByDateRange(fechaDesde: Date, fechaHasta: Date) {
  return prisma.loteLeche.findMany({
    where: { fechaProduccion: { gte: fechaDesde, lte: fechaHasta } },
    orderBy: { fechaProduccion: 'desc' },
    select: {
      id: true,
      codigo: true,
      fechaProduccion: true,
      fechaVencimiento: true,
      estado: true,
      litrosTotales: true,
      litrosDescartados: true,
      litrosNetos: true,
      ventaDetalles: {
        select: {
          litrosVendidos: true,
        },
      },
    },
  });
}

export function findAvailableLotesLeche() {
  return prisma.loteLeche.findMany({
    where: { estado: 'DISPONIBLE' },
    orderBy: { fechaVencimiento: 'asc' },
    select: {
      id: true,
      codigo: true,
      fechaProduccion: true,
      fechaVencimiento: true,
      estado: true,
      litrosNetos: true,
      ventaDetalles: {
        select: {
          litrosVendidos: true,
        },
      },
    },
  });
}

export function findVentasByDateRange(fechaDesde: Date, fechaHasta: Date) {
  return prisma.venta.findMany({
    where: { fechaVenta: { gte: fechaDesde, lte: fechaHasta } },
    orderBy: { fechaVenta: 'desc' },
    select: {
      id: true,
      numeroFactura: true,
      fechaVenta: true,
      totalLitros: true,
      precioTotal: true,
      cliente: {
        select: {
          id: true,
          razonSocial: true,
        },
      },
    },
  });
}

export function findInsumosForDashboard() {
  return prisma.insumoAlimentacion.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      unidadMedida: true,
      stockActual: true,
      stockMinimo: true,
    },
  });
}

export function findUltimosMovimientosStockForDashboard() {
  return prisma.movimientoStockAlimentacion.findMany({
    take: 5,
    orderBy: { fecha: 'desc' },
    select: {
      id: true,
      fecha: true,
      tipoMovimiento: true,
      cantidad: true,
      insumo: {
        select: {
          nombre: true,
          unidadMedida: true,
        },
      },
    },
  });
}

export function findUltimosRegistrosAlimentacionForDashboard() {
  return prisma.registroAlimentacion.findMany({
    take: 5,
    orderBy: { fecha: 'desc' },
    select: {
      id: true,
      fecha: true,
      cantidadKg: true,
      categoriaAnimal: true,
      lote: {
        select: {
          nombre: true,
        },
      },
      racion: {
        select: {
          nombre: true,
        },
      },
    },
  });
}

export function findSanitaryTasksForDashboard(todayStart: Date, nextLimit: Date) {
  return prisma.agendaTarea.findMany({
    where: {
      estado: EstadoTarea.PENDIENTE,
      tipoSanitario: { not: null },
      fechaObjetivo: { lte: nextLimit },
    },
    take: 8,
    orderBy: [{ fechaObjetivo: 'asc' }, { fechaProgramada: 'asc' }],
    select: {
      id: true,
      tipo: true,
      tipoSanitario: true,
      fechaObjetivo: true,
      fechaProgramada: true,
      estado: true,
      alcanceTipo: true,
      alcanceCategoria: true,
      alcanceLote: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });
}

export function countSanitaryTasks(where: Prisma.AgendaTareaWhereInput) {
  return prisma.agendaTarea.count({ where });
}

export function findUltimosEventosSanitarios() {
  return prisma.evento.findMany({
    take: 5,
    where: { tipo: { in: [TipoEvento.VACUNACION, TipoEvento.CLINICO] } },
    orderBy: { fecha: 'desc' },
    select: {
      id: true,
      fecha: true,
      tipo: true,
      observaciones: true,
      animal: {
        select: {
          id: true,
          caravana: true,
        },
      },
    },
  });
}

export function findUltimosEventos() {
  return prisma.evento.findMany({
    take: 8,
    orderBy: { fecha: 'desc' },
    select: {
      id: true,
      fecha: true,
      tipo: true,
      observaciones: true,
      animal: {
        select: {
          id: true,
          caravana: true,
          lote: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
    },
  });
}
