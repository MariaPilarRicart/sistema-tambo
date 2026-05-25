import { prisma } from '../config/prisma';

export function findUserByUsername(username: string) {
  return prisma.usuario.findUnique({
    where: { username },
  });
}

export function findActiveUserById(id: number) {
  return prisma.usuario.findFirst({
    where: {
      id,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      username: true,
      rol: true,
    },
  });
}
