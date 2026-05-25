import { CategoriaAnimal } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  countAnimalsByIds,
  createVaccinationTasks,
  findActiveAnimalsForVaccination,
  findPendingVaccinationTasks,
  findVaccinationEvents,
} from '../repositories/vacunacion.repository';

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !value) {
    throw new AppError('Fecha programada es obligatoria.', 400);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Fecha programada invalida.', 400);

  return date;
}

function parseOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} invalida.`, 400);
  return value.trim() || null;
}

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} invalido.`, 400);
  return parsed;
}

function parseCategoria(value: unknown) {
  if (Object.values(CategoriaAnimal).includes(value as CategoriaAnimal)) {
    return value as CategoriaAnimal;
  }

  throw new AppError('Categoria invalida.', 400);
}

function parseAnimalIds(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const ids = value.map((id) => parseId(id, 'animalId'));
  return ids.length > 0 ? ids : undefined;
}

export function listPendingVaccinations() {
  return findPendingVaccinationTasks();
}

export function listVaccinationEvents() {
  return findVaccinationEvents();
}

export async function scheduleVaccination(input: Record<string, unknown>) {
  const fechaProgramada = parseDate(input.fechaProgramada);
  const descripcion = parseOptionalString(input.descripcion, 'Descripcion');
  const animalIds = parseAnimalIds(input.animalIds);
  const loteId = input.loteId ? parseId(input.loteId, 'loteId') : undefined;
  const categoria = input.categoria ? parseCategoria(input.categoria) : undefined;

  if (!animalIds && !loteId && !categoria) {
    throw new AppError('Debe seleccionar al menos un animal, lote o categoria.', 400);
  }

  const animals = await findActiveAnimalsForVaccination({ animalIds, loteId, categoria });

  if (animalIds) {
    const uniqueRequestedIds = Array.from(new Set(animalIds));
    const existingCount = await countAnimalsByIds(uniqueRequestedIds);

    if (existingCount !== uniqueRequestedIds.length || animals.length !== uniqueRequestedIds.length) {
      throw new AppError('Todos los animales seleccionados deben existir y estar activos.', 400);
    }
  }

  if (animals.length === 0) {
    throw new AppError('No se encontraron animales activos para programar la vacunación.', 400);
  }

  const uniqueAnimalIds = Array.from(new Set(animals.map((animal) => animal.id)));
  const result = await createVaccinationTasks({
    animalIds: uniqueAnimalIds,
    fechaProgramada,
    descripcion,
  });

  return {
    tareasCreadas: result.count,
  };
}
