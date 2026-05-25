import { prisma } from '../config/prisma';

const racionSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  activa: true,
  createdAt: true,
  updatedAt: true,
};

const registroInclude = {
  lote: {
    select: {
      id: true,
      nombre: true,
      activo: true,
    },
  },
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

export function createRacion(data: { nombre: string; descripcion?: string | null; activa?: boolean }) {
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

export function findLoteForFeeding(id: number) {
  return prisma.lote.findUnique({
    where: { id },
    select: {
      id: true,
      activo: true,
    },
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
  loteId: number;
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
    by: ['loteId'],
    _sum: { cantidadKg: true },
    orderBy: { loteId: 'asc' },
  });
}

export function groupAlimentacionByRacion() {
  return prisma.registroAlimentacion.groupBy({
    by: ['racionId'],
    _sum: { cantidadKg: true },
    orderBy: { racionId: 'asc' },
  });
}

export function findLotesByIds(ids: number[]) {
  return prisma.lote.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
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
    distinct: ['loteId'],
    select: { loteId: true },
  });
}

export function findUltimosRegistrosAlimentacion() {
  return prisma.registroAlimentacion.findMany({
    take: 8,
    orderBy: { fecha: 'desc' },
    include: registroInclude,
  });
}
