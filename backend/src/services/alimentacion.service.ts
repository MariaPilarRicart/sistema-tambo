import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  aggregateTotalKg,
  countDistinctLotesAlimentados,
  countRacionesActivas,
  countRegistros,
  createRacion,
  createRegistroAlimentacion,
  deactivateRacion,
  findActiveRacion,
  findLoteForFeeding,
  findLotesByIds,
  findRacionById,
  findRacionByNombre,
  findRaciones,
  findRacionesByIds,
  findRegistrosAlimentacion,
  findUltimosRegistrosAlimentacion,
  groupAlimentacionByLote,
  groupAlimentacionByRacion,
  updateRacion,
} from '../repositories/alimentacion.repository';

const RACION_EXISTS_MESSAGE = 'Ya existe una racion con ese nombre.';

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} invalido.`, 400);
  return parsed;
}

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !value) throw new AppError('Fecha es obligatoria.', 400);
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Fecha invalida.', 400);
  return date;
}

function parseCantidadKg(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new AppError('La cantidad debe ser mayor a 0.', 400);
  return parsed;
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} invalida.`, 400);
  return value.trim() || null;
}

function handlePrismaUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(RACION_EXISTS_MESSAGE, 409);
  }

  throw error;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export function listRaciones() {
  return findRaciones();
}

export async function createNewRacion(input: Record<string, unknown>) {
  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  if (!nombre) throw new AppError('Nombre de la racion es obligatorio.', 400);

  const existing = await findRacionByNombre(nombre);
  if (existing) throw new AppError(RACION_EXISTS_MESSAGE, 409);

  try {
    return await createRacion({
      nombre,
      descripcion: normalizeOptionalString(input.descripcion, 'Descripcion'),
      activa: input.activa === undefined ? true : Boolean(input.activa),
    });
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function updateExistingRacion(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de racion');
  const existing = await findRacionById(id);
  if (!existing) throw new AppError('Racion no encontrada.', 404);

  const data: Parameters<typeof updateRacion>[1] = {};
  if (input.nombre !== undefined) {
    const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
    if (!nombre) throw new AppError('Nombre de la racion no puede estar vacio.', 400);
    data.nombre = nombre;
  }
  if (input.descripcion !== undefined) data.descripcion = normalizeOptionalString(input.descripcion, 'Descripcion');
  if (input.activa !== undefined) data.activa = Boolean(input.activa);

  try {
    return await updateRacion(id, data);
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function deactivateExistingRacion(idParam: string) {
  const id = parseId(idParam, 'Id de racion');
  const existing = await findRacionById(id);
  if (!existing) throw new AppError('Racion no encontrada.', 404);

  return deactivateRacion(id);
}

export function listRegistrosAlimentacion() {
  return findRegistrosAlimentacion();
}

export async function createNewRegistroAlimentacion(input: Record<string, unknown>, usuarioId?: number) {
  const loteId = parseId(input.loteId, 'loteId');
  const racionId = parseId(input.racionId, 'racionId');
  const fecha = parseDate(input.fecha);
  const cantidadKg = parseCantidadKg(input.cantidadKg);

  const lote = await findLoteForFeeding(loteId);
  if (!lote || !lote.activo) throw new AppError('El lote debe existir y estar activo.', 400);

  const racion = await findActiveRacion(racionId);
  if (!racion) throw new AppError('La racion debe existir y estar activa.', 400);

  return createRegistroAlimentacion({
    fecha,
    loteId,
    racionId,
    cantidadKg,
    observaciones: normalizeOptionalString(input.observaciones, 'Observaciones'),
    usuarioId: usuarioId ?? null,
  });
}

export async function getResumenAlimentacion() {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const [
    totalKg,
    registrosHoy,
    racionesActivas,
    lotesAlimentados,
    porLote,
    porRacion,
    ultimosRegistros,
  ] = await Promise.all([
    aggregateTotalKg(),
    countRegistros({ fecha: { gte: todayStart, lte: todayEnd } }),
    countRacionesActivas(),
    countDistinctLotesAlimentados(),
    groupAlimentacionByLote(),
    groupAlimentacionByRacion(),
    findUltimosRegistrosAlimentacion(),
  ]);

  const lotes = await findLotesByIds(porLote.map((item) => item.loteId));
  const raciones = await findRacionesByIds(porRacion.map((item) => item.racionId));

  return {
    totalKgEntregados: totalKg._sum.cantidadKg ?? 0,
    registrosHoy,
    racionesActivas,
    lotesAlimentados: lotesAlimentados.length,
    alimentacionPorLote: porLote.map((item) => ({
      loteId: item.loteId,
      nombre: lotes.find((lote) => lote.id === item.loteId)?.nombre ?? `Lote ${item.loteId}`,
      totalKg: item._sum.cantidadKg ?? 0,
    })),
    alimentacionPorRacion: porRacion.map((item) => ({
      racionId: item.racionId,
      nombre: raciones.find((racion) => racion.id === item.racionId)?.nombre ?? `Racion ${item.racionId}`,
      totalKg: item._sum.cantidadKg ?? 0,
    })),
    ultimosRegistros,
  };
}
