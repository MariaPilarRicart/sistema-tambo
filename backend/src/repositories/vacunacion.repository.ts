import type { CategoriaAnimal, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const usuarioSelect = {
  id: true,
  nombre: true,
  username: true,
  rol: true,
};

const vaccinationTaskInclude = {
  animal: {
    select: {
      id: true,
      caravana: true,
      categoriaAnimal: true,
      estadoReproductivo: true,
      estadoAnimal: true,
      activo: true,
      loteId: true,
      lote: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  usuario: { select: usuarioSelect },
  alcanceLote: {
    select: {
      id: true,
      nombre: true,
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
      usuario: { select: usuarioSelect },
    },
  },
};

export type VaccinationTaskWithRelations = Prisma.AgendaTareaGetPayload<{ include: typeof vaccinationTaskInclude }>;

export function findVaccinationTasks(filters: {
  tipoSanitario?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}) {
  return prisma.agendaTarea.findMany({
    where: {
      tipo: 'VACUNACION',
      tipoSanitario: filters.tipoSanitario,
      fechaProgramada: {
        gte: filters.fechaDesde,
        lte: filters.fechaHasta,
      },
    },
    orderBy: [{ fechaProgramada: 'desc' }, { id: 'desc' }],
    include: vaccinationTaskInclude,
  });
}

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
  tipoSanitario: string;
  alcanceTipo: string;
  alcanceLoteId?: number | null;
  alcanceCategoria?: CategoriaAnimal | null;
  grupoSanitarioId: string;
  usuarioId?: number | null;
}) {
  return prisma.agendaTarea.createMany({
    data: data.animalIds.map((animalId) => ({
      animalId,
      tipo: 'VACUNACION',
      fechaProgramada: data.fechaProgramada,
      estado: 'PENDIENTE',
      descripcion: data.descripcion ?? null,
      tipoSanitario: data.tipoSanitario,
      alcanceTipo: data.alcanceTipo,
      alcanceLoteId: data.alcanceLoteId ?? null,
      alcanceCategoria: data.alcanceCategoria ?? null,
      grupoSanitarioId: data.grupoSanitarioId,
      cantidadAnimalesAlcanzados: data.animalIds.length,
      usuarioId: data.usuarioId ?? null,
    })),
  });
}
