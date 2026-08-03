import type { CategoriaAnimal, EstadoAnimal, EstadoReproductivo, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const CARAVANA_LOCK_KEY = 2026080101;
const MAX_CARAVANA_NUMBER = 999999;

const animalInclude = {
  lote: {
    select: {
      id: true,
      nombre: true,
      tipoFuncional: true,
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

export function findActiveLoteByNombre(nombre: string) {
  return prisma.lote.findFirst({
    where: {
      nombre,
      activo: true,
    },
  });
}

export type AnimalCreateData = {
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
};

function formatCaravanaNumber(value: number) {
  return String(value).padStart(6, '0');
}

async function calculateNextCaravana(tx: Prisma.TransactionClient | typeof prisma) {
  const rows = await tx.$queryRaw<Array<{ nextValue: string }>>`
    SELECT (COALESCE(MAX(caravana::bigint), 0) + 1)::text AS "nextValue"
    FROM animales
    WHERE caravana ~ '^[0-9]+$'
  `;
  const next = Number(rows[0]?.nextValue ?? 1);

  if (!Number.isSafeInteger(next) || next < 1 || next > MAX_CARAVANA_NUMBER) {
    throw new Error('No hay caravanas automaticas disponibles con seis digitos.');
  }

  return formatCaravanaNumber(next);
}

export function getNextGeneratedCaravana() {
  return calculateNextCaravana(prisma);
}

export function createAnimal(data: AnimalCreateData & { caravana: string }) {
  return prisma.animal.create({
    data,
    include: animalInclude,
  });
}

export async function createAnimalWithGeneratedCaravanaInTransaction(
  tx: Prisma.TransactionClient,
  data: AnimalCreateData,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CARAVANA_LOCK_KEY})`;
  const caravana = await calculateNextCaravana(tx);

  return tx.animal.create({
    data: {
      ...data,
      caravana,
    },
    include: animalInclude,
  });
}

export function createAnimalWithGeneratedCaravana(data: AnimalCreateData) {
  return prisma.$transaction((tx) => createAnimalWithGeneratedCaravanaInTransaction(tx, data));
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
