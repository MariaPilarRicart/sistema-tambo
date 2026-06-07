import type { RolUsuario } from '@prisma/client';
import { prisma } from '../config/prisma';

const userSelect = {
  id: true,
  nombre: true,
  username: true,
  email: true,
  rol: true,
  activo: true,
  debeCambiarPassword: true,
  fotoPerfil: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function findUsers() {
  return prisma.usuario.findMany({
    orderBy: { id: 'asc' },
    select: userSelect,
  });
}

export function findUserById(id: number) {
  return prisma.usuario.findUnique({
    where: { id },
    select: userSelect,
  });
}

export function findUserByUsername(username: string) {
  return prisma.usuario.findUnique({
    where: { username },
  });
}

export function createUser(data: {
  nombre: string;
  username: string;
  email?: string | null;
  passwordHash: string;
  rol: RolUsuario;
  activo?: boolean;
  debeCambiarPassword?: boolean;
  fotoPerfil?: string | null;
}) {
  return prisma.usuario.create({
    data,
    select: userSelect,
  });
}

export function updateUser(
  id: number,
  data: Partial<{
    nombre: string;
    username: string;
    email: string | null;
    passwordHash: string;
    rol: RolUsuario;
    activo: boolean;
    debeCambiarPassword: boolean;
    fotoPerfil: string | null;
  }>,
) {
  return prisma.usuario.update({
    where: { id },
    data,
    select: userSelect,
  });
}

export function deactivateUser(id: number) {
  return prisma.usuario.update({
    where: { id },
    data: { activo: false },
    select: userSelect,
  });
}

export function resetUserPassword(id: number, passwordHash: string) {
  return prisma.usuario.update({
    where: { id },
    data: {
      passwordHash,
      debeCambiarPassword: true,
    },
    select: userSelect,
  });
}
