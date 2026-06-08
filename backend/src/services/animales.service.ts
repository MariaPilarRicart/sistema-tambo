import { CategoriaAnimal, EstadoAnimal, EstadoReproductivo, Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createAnimal,
  deactivateAnimal,
  findActiveLoteById,
  findAnimalFichaById,
  findAnimalByCaravana,
  findAnimalById,
  findAnimales,
  getRodeoSummaryCounts,
  updateAnimal,
} from '../repositories/animales.repository';
import { withEstadoCalculado } from './tareas-state.service';

const CARAVANA_EXISTS_MESSAGE = 'No puede agregar dos animales con el mismo número de caravana';
const ESTADOS_BAJA: EstadoAnimal[] = [
  EstadoAnimal.VENDIDO,
  EstadoAnimal.MUERTO,
  EstadoAnimal.ROBADO,
  EstadoAnimal.TRASLADADO,
  EstadoAnimal.OTRO,
];

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} invalido.`, 400);
  }

  return parsed;
}

function parseBoolean(value: unknown) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new AppError('Filtro activo invalido.', 400);
}

function parseCategoria(value: unknown) {
  if (Object.values(CategoriaAnimal).includes(value as CategoriaAnimal)) {
    return value as CategoriaAnimal;
  }

  throw new AppError('Categoria invalida.', 400);
}

function parseEstadoReproductivo(value: unknown) {
  if (Object.values(EstadoReproductivo).includes(value as EstadoReproductivo)) {
    return value as EstadoReproductivo;
  }

  throw new AppError('Estado reproductivo invalido.', 400);
}

function parseEstadoAnimal(value: unknown) {
  if (Object.values(EstadoAnimal).includes(value as EstadoAnimal)) {
    return value as EstadoAnimal;
  }

  throw new AppError('Estado del animal invalido.', 400);
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} invalido.`, 400);
  }

  return value.trim() || null;
}

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !value) {
    throw new AppError('Fecha de nacimiento es obligatoria.', 400);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 9, 0, 0, 0) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError('Fecha de nacimiento invalida.', 400);
  }

  return date;
}

function handlePrismaUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(CARAVANA_EXISTS_MESSAGE, 409);
  }

  throw error;
}

async function ensureActiveLoteExists(loteId: number) {
  const lote = await findActiveLoteById(loteId);

  if (!lote) {
    throw new AppError('El animal debe pertenecer a un lote existente y activo.', 400);
  }
}

async function ensureMadreExists(madreId: number, animalId?: number) {
  if (animalId && madreId === animalId) {
    throw new AppError('La madre no puede ser el mismo animal.', 400);
  }

  const madre = await findAnimalById(madreId);

  if (!madre) {
    throw new AppError('La madre informada no existe.', 400);
  }
}

function parseOptionalMadreId(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseId(value, 'madreId');
}

export async function listAnimales(query: Record<string, unknown>) {
  return findAnimales({
    caravana: typeof query.caravana === 'string' ? query.caravana.trim() : undefined,
    categoriaAnimal: query.categoriaAnimal ? parseCategoria(query.categoriaAnimal) : undefined,
    loteId: query.loteId ? parseId(query.loteId, 'loteId') : undefined,
    estadoReproductivo: query.estadoReproductivo
      ? parseEstadoReproductivo(query.estadoReproductivo)
      : undefined,
    estadoAnimal: query.estadoAnimal ? parseEstadoAnimal(query.estadoAnimal) : undefined,
    activo: parseBoolean(query.activo),
  });
}

export function getRodeoResumen() {
  return getRodeoSummaryCounts();
}

export async function getAnimal(idParam: string) {
  const id = parseId(idParam, 'Id de animal');
  const animal = await findAnimalById(id);

  if (!animal) {
    throw new AppError('Animal no encontrado.', 404);
  }

  return animal;
}

export async function getAnimalFicha(idParam: string) {
  const id = parseId(idParam, 'Id de animal');
  const animal = await findAnimalFichaById(id);

  if (!animal) {
    throw new AppError('Animal no encontrado.', 404);
  }

  return {
    ...animal,
    tareas: animal.tareas.map((tarea) => withEstadoCalculado(tarea)),
  };
}

export async function createNewAnimal(input: Record<string, unknown>) {
  const caravana = typeof input.caravana === 'string' ? input.caravana.trim() : '';
  const loteId = parseId(input.loteId, 'loteId');
  const madreId = parseOptionalMadreId(input.madreId);

  if (!caravana) {
    throw new AppError('Caravana es obligatoria.', 400);
  }

  const existingAnimal = await findAnimalByCaravana(caravana);

  if (existingAnimal) {
    throw new AppError(CARAVANA_EXISTS_MESSAGE, 409);
  }

  await ensureActiveLoteExists(loteId);
  if (madreId) await ensureMadreExists(madreId);

  try {
    return await createAnimal({
      caravana,
      nombre: normalizeOptionalString(input.nombre, 'Nombre'),
      fechaNacimiento: parseDate(input.fechaNacimiento),
      raza: normalizeOptionalString(input.raza, 'Raza'),
      categoriaAnimal: parseCategoria(input.categoriaAnimal ?? input.categoria),
      estadoReproductivo: parseEstadoReproductivo(input.estadoReproductivo ?? EstadoReproductivo.VACIA),
      estadoAnimal: parseEstadoAnimal(input.estadoAnimal ?? EstadoAnimal.ACTIVO),
      activo: input.activo === undefined ? true : Boolean(input.activo),
      loteId,
      madreId,
      padreNombre: normalizeOptionalString(input.padreNombre, 'Padre'),
    });
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function updateExistingAnimal(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de animal');
  const existingAnimal = await findAnimalById(id);

  if (!existingAnimal) {
    throw new AppError('Animal no encontrado.', 404);
  }

  if (input.caravana !== undefined && input.caravana !== existingAnimal.caravana) {
    throw new AppError('La caravana no puede modificarse despues del alta.', 400);
  }

  const data: Parameters<typeof updateAnimal>[1] = {};

  if (input.nombre !== undefined) data.nombre = normalizeOptionalString(input.nombre, 'Nombre');
  if (input.fechaNacimiento !== undefined) data.fechaNacimiento = parseDate(input.fechaNacimiento);
  if (input.raza !== undefined) data.raza = normalizeOptionalString(input.raza, 'Raza');
  if (input.categoriaAnimal !== undefined || input.categoria !== undefined) {
    data.categoriaAnimal = parseCategoria(input.categoriaAnimal ?? input.categoria);
  }
  if (input.estadoReproductivo !== undefined) {
    data.estadoReproductivo = parseEstadoReproductivo(input.estadoReproductivo);
  }
  if (input.estadoAnimal !== undefined) data.estadoAnimal = parseEstadoAnimal(input.estadoAnimal);
  if (input.activo !== undefined) data.activo = Boolean(input.activo);
  if (input.fechaBaja !== undefined) {
    data.fechaBaja = input.fechaBaja ? parseDate(input.fechaBaja) : null;
  }
  if (input.observacionesBaja !== undefined) {
    data.observacionesBaja = normalizeOptionalString(input.observacionesBaja, 'Observaciones de baja');
  }
  if (input.loteId !== undefined) {
    const loteId = parseId(input.loteId, 'loteId');
    await ensureActiveLoteExists(loteId);
    data.loteId = loteId;
  }
  if (input.madreId !== undefined) {
    const madreId = parseOptionalMadreId(input.madreId);
    if (madreId) await ensureMadreExists(madreId, id);
    data.madreId = madreId;
  }
  if (input.padreNombre !== undefined) {
    data.padreNombre = normalizeOptionalString(input.padreNombre, 'Padre');
  }

  return updateAnimal(id, data);
}

export async function deactivateExistingAnimal(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de animal');
  const existingAnimal = await findAnimalById(id);

  if (!existingAnimal) {
    throw new AppError('Animal no encontrado.', 404);
  }

  const estadoAnimal = input.estadoAnimal ? parseEstadoAnimal(input.estadoAnimal) : EstadoAnimal.VENDIDO;

  if (!ESTADOS_BAJA.includes(estadoAnimal)) {
    throw new AppError('Para dar de baja, el motivo debe ser VENDIDO, MUERTO, ROBADO, TRASLADADO u OTRO.', 400);
  }

  return deactivateAnimal(id, {
    estadoAnimal,
    fechaBaja: new Date(),
    observacionesBaja: normalizeOptionalString(input.observacionesBaja, 'Observaciones de baja'),
  });
}
