import type { EstadoTarea, TipoTarea } from '@prisma/client';
import { prisma } from '../config/prisma';

const agendaInclude = {
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

export function findAgenda(filters: {
  estado?: EstadoTarea;
  tipo?: TipoTarea;
  animalId?: number;
  fechaDesde?: Date;
  fechaHasta?: Date;
}) {
  return prisma.agendaTarea.findMany({
    where: {
      estado: filters.estado,
      tipo: filters.tipo === 'VACUNACION' ? 'VACUNACION' : filters.tipo,
      NOT: { tipo: 'VACUNACION' },
      animalId: filters.animalId,
      fechaProgramada: {
        gte: filters.fechaDesde,
        lte: filters.fechaHasta,
      },
    },
    orderBy: { fechaProgramada: 'asc' },
    include: agendaInclude,
  });
}

export function findOpenAgenda() {
  return prisma.agendaTarea.findMany({
    where: { estado: { notIn: ['REALIZADA', 'CANCELADA'] }, NOT: { tipo: 'VACUNACION' } },
    orderBy: { fechaProgramada: 'asc' },
    include: agendaInclude,
  });
}

export function findAgendaTaskById(id: number) {
  return prisma.agendaTarea.findUnique({
    where: { id },
    include: agendaInclude,
  });
}

export function cancelAgendaTask(id: number, observacion?: string | null) {
  return prisma.agendaTarea.update({
    where: { id },
    data: {
      estado: 'CANCELADA',
      descripcion: observacion ?? undefined,
    },
    include: agendaInclude,
  });
}

export function findOperativeOpenAgenda() {
  return prisma.agendaTarea.findMany({
    where: { estado: { notIn: ['REALIZADA', 'CANCELADA'] } },
    orderBy: { fechaProgramada: 'asc' },
    include: agendaInclude,
  });
}
