import { EstadoTarea, Prisma, TipoTarea } from '@prisma/client';
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
