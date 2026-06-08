import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const clienteSelect = {
  id: true,
  cuit: true,
  razonSocial: true,
  direccion: true,
  telefono: true,
  email: true,
  fechaAlta: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClienteSelect;

export function findClientes(search?: string, activo?: boolean, fechaDesde?: Date, fechaHasta?: Date) {
  return prisma.cliente.findMany({
    where: {
      activo,
      fechaAlta: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
      OR: search
        ? [
            { cuit: { contains: search, mode: 'insensitive' } },
            { razonSocial: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    },
    orderBy: [{ activo: 'desc' }, { razonSocial: 'asc' }],
    select: clienteSelect,
  });
}

export function findClienteById(id: number) {
  return prisma.cliente.findUnique({
    where: { id },
    include: {
      ventas: {
        orderBy: { fechaVenta: 'desc' },
        include: {
          usuario: { select: { id: true, nombre: true, username: true, rol: true } },
          detalles: { include: { loteLeche: true } },
        },
      },
    },
  });
}

export function findClienteByCuit(cuit: string) {
  return prisma.cliente.findUnique({ where: { cuit } });
}

export function createCliente(data: Prisma.ClienteCreateInput) {
  return prisma.cliente.create({ data, select: clienteSelect });
}

export function updateCliente(id: number, data: Prisma.ClienteUpdateInput) {
  return prisma.cliente.update({
    where: { id },
    data,
    select: clienteSelect,
  });
}
