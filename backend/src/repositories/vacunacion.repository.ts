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
      nombre: true,
      fechaNacimiento: true,
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
  fechaProgramadaDesde?: Date;
  fechaProgramadaHasta?: Date;
  fechaObjetivoDesde?: Date;
  fechaObjetivoHasta?: Date;
  fechaRealizadaDesde?: Date;
  fechaRealizadaHasta?: Date;
  loteId?: number;
  categoriaAnimal?: CategoriaAnimal;
}) {
  return prisma.agendaTarea.findMany({
    where: {
      tipo: 'VACUNACION',
      tipoSanitario: filters.tipoSanitario ?? { not: null },
      fechaProgramada: filters.fechaProgramadaDesde || filters.fechaProgramadaHasta ? {
        gte: filters.fechaProgramadaDesde,
        lte: filters.fechaProgramadaHasta,
      } : undefined,
      fechaObjetivo: filters.fechaObjetivoDesde || filters.fechaObjetivoHasta ? {
        gte: filters.fechaObjetivoDesde,
        lte: filters.fechaObjetivoHasta,
      } : undefined,
      fechaRealizacion: filters.fechaRealizadaDesde || filters.fechaRealizadaHasta ? {
        gte: filters.fechaRealizadaDesde,
        lte: filters.fechaRealizadaHasta,
      } : undefined,
      animal: filters.loteId || filters.categoriaAnimal ? {
        loteId: filters.loteId,
        categoriaAnimal: filters.categoriaAnimal,
      } : undefined,
    },
    orderBy: [{ fechaProgramada: 'desc' }, { id: 'desc' }],
    include: vaccinationTaskInclude,
  });
}

export function findOpenVaccinationTasks() {
  return prisma.agendaTarea.findMany({
    where: {
      tipo: 'VACUNACION',
      estado: 'PENDIENTE',
      tipoSanitario: { not: null },
    },
    include: vaccinationTaskInclude,
  });
}

export function findLatestPerformedVaccinations() {
  return prisma.agendaTarea.findMany({
    where: {
      tipo: 'VACUNACION',
      estado: 'REALIZADA',
      fechaRealizacion: { not: null },
      tipoSanitario: { not: null },
    },
    orderBy: [{ fechaRealizacion: 'desc' }, { id: 'desc' }],
    include: vaccinationTaskInclude,
  });
}

export function findVaccinationTaskById(id: number) {
  return prisma.agendaTarea.findUnique({
    where: { id },
    include: vaccinationTaskInclude,
  });
}

export function findSanitaryRules(filters: { onlyActive?: boolean } = {}) {
  return prisma.reglaSanitaria.findMany({
    where: { activo: filters.onlyActive ? true : undefined },
    orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
  });
}

export function findSanitaryRuleByCode(codigo: string) {
  return prisma.reglaSanitaria.findUnique({ where: { codigo } });
}

export function findSanitaryRuleById(id: number) {
  return prisma.reglaSanitaria.findUnique({ where: { id } });
}

export function createSanitaryRule(data: Prisma.ReglaSanitariaCreateInput) {
  return prisma.reglaSanitaria.create({ data });
}

export function updateSanitaryRule(id: number, data: Prisma.ReglaSanitariaUpdateInput) {
  return prisma.reglaSanitaria.update({
    where: { id },
    data,
  });
}

export function createAutomaticVaccinationTasks(tasks: Array<{
  animalId: number;
  fechaProgramada: Date;
  fechaObjetivo: Date;
  descripcion: string;
  tipoSanitario: string;
}>) {
  if (tasks.length === 0) return Promise.resolve({ count: 0 });
  return prisma.agendaTarea.createMany({
    data: tasks.map((task) => ({
      animalId: task.animalId,
      tipo: 'VACUNACION',
      fechaProgramada: task.fechaProgramada,
      fechaObjetivo: task.fechaObjetivo,
      estado: 'PENDIENTE',
      descripcion: task.descripcion,
      tipoSanitario: task.tipoSanitario,
      alcanceTipo: 'ANIMAL',
      grupoSanitarioId: null,
      cantidadAnimalesAlcanzados: 1,
    })),
  });
}

export function markVaccinationTaskAsDone(data: {
  taskId: number;
  animalId: number;
  usuarioId: number;
  fechaRealizada: Date;
  observaciones?: string | null;
  tipoSanitario: string;
}) {
  return prisma.$transaction(async (tx) => {
    const evento = await tx.evento.create({
      data: {
        animalId: data.animalId,
        usuarioId: data.usuarioId,
        tipo: 'VACUNACION',
        fecha: data.fechaRealizada,
        observaciones: data.observaciones,
        datosJson: { tipoSanitario: data.tipoSanitario },
      },
    });

    return tx.agendaTarea.update({
      where: { id: data.taskId },
      data: {
        estado: 'REALIZADA',
        fechaRealizacion: data.fechaRealizada,
        usuarioId: data.usuarioId,
        eventoCierreId: evento.id,
        descripcion: data.observaciones ?? undefined,
      },
      include: vaccinationTaskInclude,
    });
  });
}

export function markVaccinationTasksAsDoneBulk(data: {
  tasks: Array<{
    taskId: number;
    animalId: number;
    tipoSanitario: string;
  }>;
  nextTasks: Array<{
    animalId: number;
    fechaProgramada: Date;
    fechaObjetivo: Date;
    descripcion?: string | null;
    tipoSanitario: string;
    usuarioId?: number | null;
  }>;
  usuarioId: number;
  fechaRealizada: Date;
  observaciones?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const updatedTasks = [];

    for (const task of data.tasks) {
      const evento = await tx.evento.create({
        data: {
          animalId: task.animalId,
          usuarioId: data.usuarioId,
          tipo: 'VACUNACION',
          fecha: data.fechaRealizada,
          observaciones: data.observaciones,
          datosJson: { tipoSanitario: task.tipoSanitario },
        },
      });

      const updatedTask = await tx.agendaTarea.update({
        where: { id: task.taskId },
        data: {
          estado: 'REALIZADA',
          fechaRealizacion: data.fechaRealizada,
          usuarioId: data.usuarioId,
          eventoCierreId: evento.id,
          descripcion: data.observaciones ?? undefined,
        },
        include: vaccinationTaskInclude,
      });

      updatedTasks.push(updatedTask);
    }

    for (const task of data.nextTasks) {
      await tx.agendaTarea.create({
        data: {
          animalId: task.animalId,
          tipo: 'VACUNACION',
          fechaProgramada: task.fechaProgramada,
          fechaObjetivo: task.fechaObjetivo,
          estado: 'PENDIENTE',
          descripcion: task.descripcion ?? null,
          tipoSanitario: task.tipoSanitario,
          alcanceTipo: 'ANIMAL',
          cantidadAnimalesAlcanzados: 1,
          usuarioId: task.usuarioId ?? null,
        },
      });
    }

    return updatedTasks;
  });
}

export function createVaccinationTask(data: {
  animalId: number;
  fechaProgramada: Date;
  fechaObjetivo: Date;
  descripcion?: string | null;
  tipoSanitario: string;
  usuarioId?: number | null;
}) {
  return prisma.agendaTarea.create({
    data: {
      animalId: data.animalId,
      tipo: 'VACUNACION',
      fechaProgramada: data.fechaProgramada,
      fechaObjetivo: data.fechaObjetivo,
      estado: 'PENDIENTE',
      descripcion: data.descripcion ?? null,
      tipoSanitario: data.tipoSanitario,
      alcanceTipo: 'ANIMAL',
      cantidadAnimalesAlcanzados: 1,
      usuarioId: data.usuarioId ?? null,
    },
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
  fechaObjetivo: Date;
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
      fechaObjetivo: data.fechaObjetivo,
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
