import type { CategoriaAnimal, EstadoAnimal, EstadoReproductivo, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const animalInclude = {
  lote: {
    select: {
      id: true,
      nombre: true,
      activo: true,
    },
  },
  madre: {
    select: {
      id: true,
      caravana: true,
      nombre: true,
    },
  },
} satisfies Prisma.AnimalInclude;

export function findAnimales(filters: {
  caravana?: string;
  categoriaAnimal?: CategoriaAnimal;
  loteId?: number;
  estadoReproductivo?: EstadoReproductivo;
  estadoAnimal?: EstadoAnimal;
  activo?: boolean;
}) {
  return prisma.animal.findMany({
    where: {
      caravana: filters.caravana
        ? {
            contains: filters.caravana,
            mode: 'insensitive',
          }
        : undefined,
      loteId: filters.loteId,
      categoriaAnimal: filters.categoriaAnimal,
      estadoReproductivo: filters.estadoReproductivo,
      estadoAnimal: filters.estadoAnimal,
      activo: filters.activo,
    },
    orderBy: { id: 'asc' },
    include: animalInclude,
  });
}

export async function getRodeoSummaryCounts() {
  const [
    totalAnimales,
    animalesActivos,
    prenadas,
    inseminadas,
    vacias,
    secasRecuperacion,
  ] = await Promise.all([
    prisma.animal.count(),
    prisma.animal.count({ where: { activo: true, estadoAnimal: 'ACTIVO' } }),
    prisma.animal.count({ where: { estadoReproductivo: 'PRENADA' } }),
    prisma.animal.count({ where: { estadoReproductivo: 'INSEMINADA' } }),
    prisma.animal.count({ where: { estadoReproductivo: 'VACIA' } }),
    prisma.animal.count({ where: { estadoReproductivo: { in: ['SECA', 'RECUPERACION'] } } }),
  ]);

  return {
    totalAnimales,
    animalesActivos,
    prenadas,
    inseminadas,
    vacias,
    secasRecuperacion,
  };
}

export function findAnimalById(id: number) {
  return prisma.animal.findUnique({
    where: { id },
    include: animalInclude,
  });
}

export function findAnimalFichaById(id: number) {
  return prisma.animal.findUnique({
    where: { id },
    include: {
      ...animalInclude,
      hijos: {
        select: {
          id: true,
          caravana: true,
          nombre: true,
          categoriaAnimal: true,
          estadoAnimal: true,
          activo: true,
        },
        orderBy: { caravana: 'asc' },
      },
      eventos: {
        orderBy: { fecha: 'desc' },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              username: true,
              rol: true,
            },
          },
        },
      },
      tareas: {
        orderBy: { fechaProgramada: 'desc' },
        include: {
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
        },
      },
    },
  });
}

export function findAnimalByCaravana(caravana: string) {
  return prisma.animal.findUnique({
    where: { caravana },
  });
}

export function findActiveLoteById(id: number) {
  return prisma.lote.findFirst({
    where: {
      id,
      activo: true,
    },
  });
}

export function createAnimal(data: {
  caravana: string;
  nombre?: string | null;
  fechaNacimiento: Date;
  raza?: string | null;
  categoriaAnimal: CategoriaAnimal;
  estadoReproductivo: EstadoReproductivo;
  estadoAnimal: EstadoAnimal;
  activo: boolean;
  loteId: number;
  madreId?: number | null;
  padreNombre?: string | null;
}) {
  return prisma.animal.create({
    data,
    include: animalInclude,
  });
}

export function updateAnimal(
  id: number,
  data: Partial<{
    nombre: string | null;
    fechaNacimiento: Date;
    raza: string | null;
    categoriaAnimal: CategoriaAnimal;
    estadoReproductivo: EstadoReproductivo;
    estadoAnimal: EstadoAnimal;
    activo: boolean;
    fechaBaja: Date | null;
    observacionesBaja: string | null;
    loteId: number;
    madreId: number | null;
    padreNombre: string | null;
  }>,
) {
  return prisma.animal.update({
    where: { id },
    data,
    include: animalInclude,
  });
}

export function deactivateAnimal(
  id: number,
  data: {
    estadoAnimal: EstadoAnimal;
    fechaBaja: Date;
    observacionesBaja?: string | null;
  },
) {
  return prisma.$transaction(async (tx) => {
    await tx.agendaTarea.updateMany({
      where: {
        animalId: id,
        estado: 'PENDIENTE',
      },
      data: {
        estado: 'CANCELADA',
      },
    });

    return tx.animal.update({
      where: { id },
      data: {
        activo: false,
        estadoAnimal: data.estadoAnimal,
        fechaBaja: data.fechaBaja,
        observacionesBaja: data.observacionesBaja ?? null,
      },
      include: animalInclude,
    });
  });
}
