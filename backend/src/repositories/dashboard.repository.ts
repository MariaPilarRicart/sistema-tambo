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
    by: ['categoria'],
    _count: { _all: true },
    orderBy: { categoria: 'asc' },
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

export function findLotesWithActiveAnimals() {
  return prisma.lote.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      animales: {
        where: {
          activo: true,
          estadoAnimal: 'ACTIVO',
        },
        select: {
          id: true,
        },
      },
    },
  });
}

export function findActiveInsumosAlimentacion() {
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

export function countTareas(where: {
  estado?: EstadoTarea;
  tipo?: TipoTarea;
  fechaProgramada?: {
    lt?: Date;
    lte?: Date;
    gt?: Date;
    gte?: Date;
  };
}) {
  return prisma.agendaTarea.count({ where });
}

export function findTareasDetalle(where: {
  estado?: EstadoTarea;
  fechaProgramada?: {
    lt?: Date;
    lte?: Date;
    gt?: Date;
    gte?: Date;
  };
}) {
  return prisma.agendaTarea.findMany({
    where,
    take: 20,
    orderBy: { fechaProgramada: 'asc' },
    select: {
      id: true,
      tipo: true,
      fechaProgramada: true,
      estado: true,
      descripcion: true,
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

export function findSanitaryEvents() {
  return prisma.evento.findMany({
    where: {
      tipo: { in: [TipoEvento.VACUNACION, TipoEvento.CLINICO] },
    },
    orderBy: { fecha: 'desc' },
    select: {
      id: true,
      fecha: true,
      observaciones: true,
      datosJson: true,
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
