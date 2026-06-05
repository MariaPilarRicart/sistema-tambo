import type { TipoEvento } from '@prisma/client';
import { prisma } from '../config/prisma';

const eventoInclude = {
  animal: {
    select: {
      id: true,
      caravana: true,
      categoriaAnimal: true,
      estadoReproductivo: true,
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

export function findEventos(filters: {
  animalId?: number;
  tipo?: TipoEvento;
  fechaDesde?: Date;
  fechaHasta?: Date;
}) {
  return prisma.evento.findMany({
    where: {
      animalId: filters.animalId,
      tipo: filters.tipo,
      fecha: {
        gte: filters.fechaDesde,
        lte: filters.fechaHasta,
      },
    },
    orderBy: { fecha: 'desc' },
    include: eventoInclude,
  });
}

export function findEventoById(id: number) {
  return prisma.evento.findUnique({
    where: { id },
    include: eventoInclude,
  });
}
