import { CategoriaAnimal, Prisma, TipoMovimientoStockAlimentacion } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  aggregateTotalKg,
  countDistinctLotesAlimentados,
  countInsumosActivos,
  countMovimientosStock,
  countRacionesActivas,
  countRegistros,
  createInsumoAlimentacion,
  createMovimientoStockAlimentacion,
  createRacion,
  createRegistroAlimentacion,
  deactivateInsumoAlimentacion,
  deactivateRacion,
  findInsumoAlimentacionById,
  findInsumoAlimentacionByNombre,
  findInsumosAlimentacion,
  findInsumosBajoStock,
  findActiveRacion,
  findMovimientosStockAlimentacion,
  findRacionById,
  findRacionByNombre,
  findRaciones,
  findRacionesByIds,
  findRegistrosAlimentacion,
  findStockPorInsumo,
  findUltimosMovimientosStockAlimentacion,
  findUltimosRegistrosAlimentacion,
  groupAlimentacionByLote,
  groupAlimentacionByRacion,
  updateInsumoAlimentacion,
  updateRacion,
} from '../repositories/alimentacion.repository';

const RACION_EXISTS_MESSAGE = 'Ya existe una racion con ese nombre.';
const INSUMO_EXISTS_MESSAGE = 'Ya existe un insumo con ese nombre.';

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

function handlePrismaUniqueError(error: unknown, message = RACION_EXISTS_MESSAGE): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(message, 409);
  }

  throw error;
}

function parseNonNegativeNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new AppError(`${fieldName} debe ser mayor o igual a 0.`, 400);
  return parsed;
}

function parseTipoMovimientoStock(value: unknown) {
  if (
    value !== TipoMovimientoStockAlimentacion.ENTRADA &&
    value !== TipoMovimientoStockAlimentacion.CONSUMO &&
    value !== TipoMovimientoStockAlimentacion.AJUSTE
  ) {
    throw new AppError('Tipo de movimiento de stock invalido.', 400);
  }

  return value;
}

function parseCategoriaAnimal(value: unknown) {
  if (Object.values(CategoriaAnimal).includes(value as CategoriaAnimal)) {
    return value as CategoriaAnimal;
  }

  throw new AppError('Categoría animal inválida.', 400);
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
      categoriaAnimal: input.categoriaAnimal ? parseCategoriaAnimal(input.categoriaAnimal) : null,
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
  if (input.categoriaAnimal !== undefined) {
    data.categoriaAnimal = input.categoriaAnimal ? parseCategoriaAnimal(input.categoriaAnimal) : null;
  }
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
  const categoriaAnimal = parseCategoriaAnimal(input.categoriaAnimal ?? input.categoria);
  const racionId = parseId(input.racionId, 'racionId');
  const fecha = parseDate(input.fecha);
  const cantidadKg = parseCantidadKg(input.cantidadKg);

  const racion = await findActiveRacion(racionId);
  if (!racion) throw new AppError('La racion debe existir y estar activa.', 400);

  return createRegistroAlimentacion({
    fecha,
    categoriaAnimal,
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

  const raciones = await findRacionesByIds(porRacion.map((item) => item.racionId).filter((id): id is number => Boolean(id)));

  return {
    totalKgEntregados: totalKg._sum.cantidadKg ?? 0,
    registrosHoy,
    racionesActivas,
    categoriasAlimentadas: lotesAlimentados.length,
    alimentacionPorCategoria: porLote.map((item) => ({
      categoriaAnimal: item.categoriaAnimal,
      nombre: item.categoriaAnimal,
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

export function listInsumosAlimentacion() {
  return findInsumosAlimentacion();
}

export async function createNewInsumoAlimentacion(input: Record<string, unknown>) {
  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  if (!nombre) throw new AppError('Nombre del insumo es obligatorio.', 400);

  const unidadMedida = typeof input.unidadMedida === 'string' ? input.unidadMedida.trim().toUpperCase() : '';
  if (!unidadMedida) throw new AppError('Unidad de medida es obligatoria.', 400);

  const existing = await findInsumoAlimentacionByNombre(nombre);
  if (existing) throw new AppError(INSUMO_EXISTS_MESSAGE, 409);

  try {
    return await createInsumoAlimentacion({
      nombre,
      descripcion: normalizeOptionalString(input.descripcion, 'Descripcion'),
      unidadMedida,
      stockMinimo: input.stockMinimo === undefined ? 0 : parseNonNegativeNumber(input.stockMinimo, 'Stock minimo'),
      activo: input.activo === undefined ? true : Boolean(input.activo),
    });
  } catch (error) {
    handlePrismaUniqueError(error, INSUMO_EXISTS_MESSAGE);
  }
}

export async function updateExistingInsumoAlimentacion(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de insumo');
  const existing = await findInsumoAlimentacionById(id);
  if (!existing) throw new AppError('Insumo no encontrado.', 404);

  const data: Parameters<typeof updateInsumoAlimentacion>[1] = {};
  if (input.nombre !== undefined) {
    const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
    if (!nombre) throw new AppError('Nombre del insumo no puede estar vacio.', 400);
    data.nombre = nombre;
  }
  if (input.descripcion !== undefined) data.descripcion = normalizeOptionalString(input.descripcion, 'Descripcion');
  if (input.unidadMedida !== undefined) {
    const unidadMedida = typeof input.unidadMedida === 'string' ? input.unidadMedida.trim().toUpperCase() : '';
    if (!unidadMedida) throw new AppError('Unidad de medida no puede estar vacia.', 400);
    data.unidadMedida = unidadMedida;
  }
  if (input.stockMinimo !== undefined) data.stockMinimo = parseNonNegativeNumber(input.stockMinimo, 'Stock minimo');
  if (input.activo !== undefined) data.activo = Boolean(input.activo);

  try {
    return await updateInsumoAlimentacion(id, data);
  } catch (error) {
    handlePrismaUniqueError(error, INSUMO_EXISTS_MESSAGE);
  }
}

export async function deactivateExistingInsumoAlimentacion(idParam: string) {
  const id = parseId(idParam, 'Id de insumo');
  const existing = await findInsumoAlimentacionById(id);
  if (!existing) throw new AppError('Insumo no encontrado.', 404);

  return deactivateInsumoAlimentacion(id);
}

export function listMovimientosStockAlimentacion() {
  return findMovimientosStockAlimentacion();
}

export async function createNewMovimientoStockAlimentacion(input: Record<string, unknown>, usuarioId?: number) {
  const insumoId = parseId(input.insumoId, 'insumoId');
  const tipoMovimiento = parseTipoMovimientoStock(input.tipoMovimiento);
  const fecha = parseDate(input.fecha);
  const cantidad = parseCantidadKg(input.cantidad);

  const result = await createMovimientoStockAlimentacion({
    insumoId,
    tipoMovimiento,
    fecha,
    cantidad,
    observaciones: normalizeOptionalString(input.observaciones, 'Observaciones'),
    usuarioId: usuarioId ?? null,
  });

  if (!result) throw new AppError('Insumo no encontrado.', 404);
  if ('error' in result && result.error === 'INACTIVE') {
    throw new AppError('No se pueden registrar movimientos sobre insumos inactivos.', 400);
  }
  if ('error' in result && result.error === 'INSUFFICIENT_STOCK') {
    throw new AppError('No hay stock suficiente para registrar el consumo.', 400);
  }

  return result;
}

export async function getResumenStockAlimentacion() {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const [totalInsumosActivos, insumosBajoStock, movimientosHoy, ultimosMovimientos, stockPorInsumo] =
    await Promise.all([
      countInsumosActivos(),
      findInsumosBajoStock(),
      countMovimientosStock({ fecha: { gte: todayStart, lte: todayEnd } }),
      findUltimosMovimientosStockAlimentacion(),
      findStockPorInsumo(),
    ]);

  return {
    totalInsumosActivos,
    insumosBajoStock,
    movimientosHoy,
    ultimosMovimientos,
    stockPorInsumo: stockPorInsumo.map((insumo) => ({
      ...insumo,
      bajoStock: insumo.stockActual <= insumo.stockMinimo,
    })),
  };
}
