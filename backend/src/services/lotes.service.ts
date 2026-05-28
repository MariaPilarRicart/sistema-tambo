import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  countAnimalesByLoteId,
  createLote,
  deactivateLote,
  deleteLote,
  findLoteById,
  findLoteByNombre,
  findLotes,
  updateLote,
} from '../repositories/lotes.repository';

const LOTE_EXISTS_MESSAGE = 'Ya existe un lote con ese nombre.';
const LOTE_WITH_ANIMALS_MESSAGE = 'No se puede eliminar este lote porque tiene animales asociados.';

function parseLoteId(id: string) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new AppError('Id de lote invalido.', 400);
  }

  return parsedId;
}

function normalizeDescripcion(descripcion: unknown) {
  if (descripcion === undefined || descripcion === null || descripcion === '') {
    return null;
  }

  if (typeof descripcion !== 'string') {
    throw new AppError('Descripcion invalida.', 400);
  }

  return descripcion.trim() || null;
}

function handlePrismaUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(LOTE_EXISTS_MESSAGE, 409);
  }

  throw error;
}

export async function listLotes() {
  const lotes = await findLotes();

  return lotes.map((lote) => ({
    ...lote,
    cantidadAnimales: lote._count.animales,
    _count: undefined,
  }));
}

export async function createNewLote(input: {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
}) {
  const nombre = input.nombre?.trim();

  if (!nombre) {
    throw new AppError('Nombre del lote es obligatorio.', 400);
  }

  const existingLote = await findLoteByNombre(nombre);

  if (existingLote) {
    throw new AppError(LOTE_EXISTS_MESSAGE, 409);
  }

  try {
    const lote = await createLote({
      nombre,
      descripcion: normalizeDescripcion(input.descripcion),
      activo: input.activo ?? true,
    });

    return { ...lote, cantidadAnimales: lote._count.animales, _count: undefined };
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function updateExistingLote(
  idParam: string,
  input: {
    nombre?: string;
    descripcion?: string | null;
    activo?: boolean;
  },
) {
  const id = parseLoteId(idParam);
  const existingLote = await findLoteById(id);

  if (!existingLote) {
    throw new AppError('Lote no encontrado.', 404);
  }

  const data: Parameters<typeof updateLote>[1] = {};

  if (input.nombre !== undefined) {
    const nombre = input.nombre.trim();

    if (!nombre) {
      throw new AppError('Nombre del lote no puede estar vacio.', 400);
    }

    data.nombre = nombre;
  }

  if (input.descripcion !== undefined) {
    data.descripcion = normalizeDescripcion(input.descripcion);
  }

  if (input.activo !== undefined) {
    data.activo = Boolean(input.activo);
  }

  try {
    const lote = await updateLote(id, data);

    return { ...lote, cantidadAnimales: lote._count.animales, _count: undefined };
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function deactivateExistingLote(idParam: string) {
  const id = parseLoteId(idParam);
  const existingLote = await findLoteById(id);

  if (!existingLote) {
    throw new AppError('Lote no encontrado.', 404);
  }

  const lote = await deactivateLote(id);

  return { ...lote, cantidadAnimales: lote._count.animales, _count: undefined };
}

export async function deleteExistingLote(idParam: string) {
  const id = parseLoteId(idParam);
  const existingLote = await findLoteById(id);

  if (!existingLote) {
    throw new AppError('Lote no encontrado.', 404);
  }

  const animalsCount = await countAnimalesByLoteId(id);

  if (animalsCount > 0) {
    throw new AppError(LOTE_WITH_ANIMALS_MESSAGE, 409);
  }

  try {
    const lote = await deleteLote(id);

    return { ...lote, cantidadAnimales: lote._count.animales, _count: undefined };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new AppError('No se puede eliminar este lote porque tiene registros asociados.', 409);
    }

    throw error;
  }
}
