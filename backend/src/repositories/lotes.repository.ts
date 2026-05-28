import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const loteSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      animales: true,
    },
  },
} satisfies Prisma.LoteSelect;

export function findLotes() {
  return prisma.lote.findMany({
    orderBy: { id: 'asc' },
    select: loteSelect,
  });
}

export function findLoteById(id: number) {
  return prisma.lote.findUnique({
    where: { id },
    select: loteSelect,
  });
}

export function findLoteByNombre(nombre: string) {
  return prisma.lote.findUnique({
    where: { nombre },
  });
}

export function countAnimalesByLoteId(loteId: number) {
  return prisma.animal.count({
    where: { loteId },
  });
}

export function createLote(data: { nombre: string; descripcion?: string | null; activo?: boolean }) {
  return prisma.lote.create({
    data,
    select: loteSelect,
  });
}

export function updateLote(
  id: number,
  data: Partial<{
    nombre: string;
    descripcion: string | null;
    activo: boolean;
  }>,
) {
  return prisma.lote.update({
    where: { id },
    data,
    select: loteSelect,
  });
}

export function deactivateLote(id: number) {
  return prisma.lote.update({
    where: { id },
    data: { activo: false },
    select: loteSelect,
  });
}

export function deleteLote(id: number) {
  return prisma.lote.delete({
    where: { id },
    select: loteSelect,
  });
}
