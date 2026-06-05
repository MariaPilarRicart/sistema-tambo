import type { CategoriaAnimal } from '@prisma/client';
import { prisma } from '../config/prisma';

const vaccinationTaskInclude = {
  animal: {
    select: {
      id: true,
      caravana: true,
      categoriaAnimal: true,
      estadoReproductivo: true,
      estadoAnimal: true,
      activo: true,
      lote: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  eventoOrigen: {
    select: {
      id: true,
      tipo: true,
      fecha: true,
    },
  },
  eventoCierre: {
    select: {
      id: true,
      tipo: true,
      fecha: true,
    },
  },
};

const vaccinationEventInclude = {
  animal: {
    select: {
      id: true,
      caravana: true,
      categoriaAnimal: true,
      estadoReproductivo: true,
      lote: {
        select: {
          id: true,
          nombre: true,
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
};

export function findPendingVaccinationTasks() {
  return prisma.agendaTarea.findMany({
    where: {
      tipo: 'VACUNACION',
      estado: 'PENDIENTE',
    },
    orderBy: { fechaProgramada: 'asc' },
    include: vaccinationTaskInclude,
  });
}

export function findVaccinationEvents() {
  return prisma.evento.findMany({
    where: { tipo: 'VACUNACION' },
    orderBy: { fecha: 'desc' },
    include: vaccinationEventInclude,
  });
}

export function findActiveAnimalsForVaccination(filters: {
  animalIds?: number[];
  loteId?: number;
  categoriaAnimal?: CategoriaAnimal;
}) {
  return prisma.animal.findMany({
    where: {
      activo: true,
      estadoAnimal: 'ACTIVO',
      id: filters.animalIds ? { in: filters.animalIds } : undefined,
      loteId: filters.loteId,
      categoriaAnimal: filters.categoriaAnimal,
    },
    select: { id: true },
  });
}

export function countAnimalsByIds(ids: number[]) {
  return prisma.animal.count({
    where: {
      id: { in: ids },
    },
  });
}

export function createVaccinationTasks(data: {
  animalIds: number[];
  fechaProgramada: Date;
  descripcion?: string | null;
}) {
  return prisma.agendaTarea.createMany({
    data: data.animalIds.map((animalId) => ({
      animalId,
      tipo: 'VACUNACION',
      fechaProgramada: data.fechaProgramada,
      estado: 'PENDIENTE',
      descripcion: data.descripcion ?? null,
    })),
  });
}
