import { CategoriaAnimal, EstadoAnimal, EstadoReproductivo, Prisma, TipoFuncionalLote } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createAnimalWithGeneratedCaravana,
  deactivateAnimal,
  findActiveLoteById,
  findAnimalFichaById,
  findAnimalById,
  findAnimales,
  getNextGeneratedCaravana,
  getRodeoSummaryCounts,
  updateAnimal,
} from '../repositories/animales.repository';
import { validarConsistenciaAnimal } from './rodeo-rules.service';
import { withEstadoCalculado } from './tareas-state.service';

const CARAVANA_EXISTS_MESSAGE = 'No puede agregar dos animales con el mismo número de caravana';
const MOTHER_CATEGORIES: CategoriaAnimal[] = [
  CategoriaAnimal.VAQUILLONA,
  CategoriaAnimal.VACA,
  CategoriaAnimal.VACA_PRODUCCION,
  CategoriaAnimal.VACA_SECA,
  CategoriaAnimal.PREPARTO,
];
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
    throw new AppError(`${fieldName} inválido.`, 400);
  }

  return parsed;
}

function parseBoolean(value: unknown) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new AppError('Filtro activo inválido.', 400);
}

function parseCategoria(value: unknown) {
  if (Object.values(CategoriaAnimal).includes(value as CategoriaAnimal)) {
    return value as CategoriaAnimal;
  }

  throw new AppError('Categoría inválida.', 400);
}

function parseEstadoReproductivo(value: unknown) {
  if (Object.values(EstadoReproductivo).includes(value as EstadoReproductivo)) {
    return value as EstadoReproductivo;
  }

  throw new AppError('Estado reproductivo inválido.', 400);
}

function parseEstadoAnimal(value: unknown) {
  if (Object.values(EstadoAnimal).includes(value as EstadoAnimal)) {
    return value as EstadoAnimal;
  }

  throw new AppError('Estado del animal inválido.', 400);
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} inválido.`, 400);
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
    throw new AppError('Fecha de nacimiento inválida.', 400);
  }

  return date;
}

function handlePrismaUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(CARAVANA_EXISTS_MESSAGE, 409);
  }

  if (error instanceof Error && error.message.includes('seis digitos')) {
    throw new AppError(error.message, 409);
  }

  throw error;
}

async function ensureActiveLoteExists(loteId: number) {
  const lote = await findActiveLoteById(loteId);

  if (!lote) {
    throw new AppError('El animal debe pertenecer a un lote existente y activo.', 400);
  }

  return lote;
}

function isOlderThanTwoYears(fechaNacimiento: Date, referenceDate: Date) {
  const cutoff = new Date(referenceDate);
  cutoff.setFullYear(cutoff.getFullYear() - 2);
  cutoff.setHours(0, 0, 0, 0);

  const birthDate = new Date(fechaNacimiento);
  birthDate.setHours(0, 0, 0, 0);

  return birthDate < cutoff;
}

async function ensureEligibleMadre(madreId: number, animalId?: number, referenceDate = new Date()) {
  if (animalId && madreId === animalId) {
    throw new AppError('La madre no puede ser el mismo animal.', 400);
  }

  const madre = await findAnimalById(madreId);

  if (!madre) {
    throw new AppError('La madre informada no existe.', 400);
  }

  if (!madre.activo || madre.estadoAnimal !== EstadoAnimal.ACTIVO) {
    throw new AppError('La madre seleccionada debe estar activa.', 400);
  }

  if (!MOTHER_CATEGORIES.includes(madre.categoriaAnimal)) {
    throw new AppError('La madre seleccionada debe ser una hembra elegible.', 400);
  }

  if (!isOlderThanTwoYears(madre.fechaNacimiento, referenceDate)) {
    throw new AppError('La madre seleccionada debe tener más de 2 años.', 400);
  }
}

function ensureLoteCompatible(
  lote: { tipoFuncional: TipoFuncionalLote },
  tipoFuncionalEsperado: TipoFuncionalLote,
) {
  if (lote.tipoFuncional !== tipoFuncionalEsperado) {
    throw new AppError('El lote seleccionado no es compatible con la edad, categoria y estado del animal.', 400);
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

export async function getProximaCaravana() {
  try {
    return await getNextGeneratedCaravana();
  } catch (error) {
    if (error instanceof Error && error.message.includes('seis digitos')) {
      throw new AppError(error.message, 409);
    }

    throw error;
  }
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
  const loteId = parseId(input.loteId, 'loteId');
  const madreId = parseOptionalMadreId(input.madreId);
  const fechaNacimiento = parseDate(input.fechaNacimiento);
  const categoriaAnimal = parseCategoria(input.categoriaAnimal ?? input.categoria);
  const estadoReproductivo = parseEstadoReproductivo(input.estadoReproductivo ?? EstadoReproductivo.NO_APLICA);

  const lote = await ensureActiveLoteExists(loteId);
  if (madreId) await ensureEligibleMadre(madreId);
  const consistencia = validarConsistenciaAnimal({
    categoriaAnimal,
    fechaNacimiento,
    estadoReproductivo,
    loteTipoFuncional: lote.tipoFuncional,
  });
  ensureLoteCompatible(lote, consistencia.loteTipoFuncional);

  try {
    return await createAnimalWithGeneratedCaravana({
      nombre: normalizeOptionalString(input.nombre, 'Nombre'),
      fechaNacimiento,
      raza: normalizeOptionalString(input.raza, 'Raza'),
      categoriaAnimal: consistencia.categoriaAnimal,
      estadoReproductivo: consistencia.estadoReproductivo,
      estadoAnimal: parseEstadoAnimal(input.estadoAnimal ?? EstadoAnimal.ACTIVO),
      activo: input.activo === undefined ? true : Boolean(input.activo),
      loteId: lote.id,
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
  const nextFechaNacimiento = input.fechaNacimiento !== undefined
    ? parseDate(input.fechaNacimiento)
    : existingAnimal.fechaNacimiento;
  const nextCategoriaAnimal = input.categoriaAnimal !== undefined || input.categoria !== undefined
    ? parseCategoria(input.categoriaAnimal ?? input.categoria)
    : existingAnimal.categoriaAnimal;
  const nextEstadoReproductivo = input.estadoReproductivo !== undefined
    ? parseEstadoReproductivo(input.estadoReproductivo)
    : existingAnimal.estadoReproductivo;
  let nextLote = input.loteId !== undefined
    ? await ensureActiveLoteExists(parseId(input.loteId, 'loteId'))
    : existingAnimal.lote;

  if (input.nombre !== undefined) data.nombre = normalizeOptionalString(input.nombre, 'Nombre');
  if (input.fechaNacimiento !== undefined) data.fechaNacimiento = nextFechaNacimiento;
  if (input.raza !== undefined) data.raza = normalizeOptionalString(input.raza, 'Raza');
  const consistencia = validarConsistenciaAnimal({
    categoriaAnimal: nextCategoriaAnimal,
    fechaNacimiento: nextFechaNacimiento,
    estadoReproductivo: nextEstadoReproductivo,
    loteTipoFuncional: nextLote.tipoFuncional,
  });
  ensureLoteCompatible(nextLote, consistencia.loteTipoFuncional);
  data.categoriaAnimal = consistencia.categoriaAnimal;
  data.estadoReproductivo = consistencia.estadoReproductivo;
  data.loteId = nextLote.id;
  if (input.estadoAnimal !== undefined) data.estadoAnimal = parseEstadoAnimal(input.estadoAnimal);
  if (input.activo !== undefined) data.activo = Boolean(input.activo);
  if (input.fechaBaja !== undefined) {
    data.fechaBaja = input.fechaBaja ? parseDate(input.fechaBaja) : null;
  }
  if (input.observacionesBaja !== undefined) {
    data.observacionesBaja = normalizeOptionalString(input.observacionesBaja, 'Observaciones de baja');
  }
  if (input.madreId !== undefined) {
    const madreId = parseOptionalMadreId(input.madreId);
    if (madreId) await ensureEligibleMadre(madreId, id);
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
