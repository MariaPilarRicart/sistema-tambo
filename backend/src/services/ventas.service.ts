import { EstadoEntregaLeche, Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createEntregaLeche,
  createLiquidacionLeche,
  deleteEntregaLeche,
  findClienteForVenta,
  findEntregaLecheById,
  findEntregasLeche,
  findEntregasPendientesPeriodo,
  findLiquidacionLecheById,
  findLiquidacionLecheByPeriodo,
  findLiquidacionesLeche,
  findOrdenesAsignadas,
  findOrdenesByIds,
  findOrdenesDisponiblesParaEntrega,
  updateEntregaLeche,
  updateLiquidacionLeche,
  type EntregaLecheFilters,
  type EntregaLecheWithRelations,
  type LiquidacionLecheFilters,
} from '../repositories/ventas.repository';

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} inválido.`, 400);
  return parsed;
}

function parseOptionalId(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseId(value, fieldName);
}

function parseDate(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value) throw new AppError(`${fieldName} es obligatoria.`, 400);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${fieldName} inválida.`, 400);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDateFilter(value: unknown, endOfDay = false) {
  if (value === undefined || value === null || value === '') return undefined;
  const date = parseDate(value, 'Fecha de filtro');
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date;
}

function parseOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new AppError(`${fieldName} inválido.`, 400);
  return parsed;
}

function parseMes(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) throw new AppError('Mes inválido.', 400);
  return parsed;
}

function parseAnio(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) throw new AppError('Año inválido.', 400);
  return parsed;
}

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(`${fieldName} es obligatorio.`, 400);
  return value.trim();
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} inválido.`, 400);
  return value.trim() || null;
}

function parseDecimal(value: unknown, fieldName: string, min = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) throw new AppError(`${fieldName} debe ser mayor o igual a ${min}.`, 400);
  return new Prisma.Decimal(parsed).toDecimalPlaces(2);
}

function parsePositiveDecimal(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new AppError(`${fieldName} debe ser mayor a 0.`, 400);
  return new Prisma.Decimal(parsed).toDecimalPlaces(2);
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function turnoLabel(turno: string) {
  const labels: Record<string, string> = {
    MANANA: 'Mañana',
    MAÑANA: 'Mañana',
    TARDE: 'Tarde',
    NOCHE: 'Noche',
  };
  return labels[turno] ?? turno;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
}

function parseEntregaFilters(input: Record<string, unknown>): EntregaLecheFilters {
  return {
    clienteId: parseOptionalId(input.clienteId, 'clienteId'),
    fechaDesde: parseDateFilter(input.fechaDesde),
    fechaHasta: parseDateFilter(input.fechaHasta, true),
    estado: input.estado === 'PENDIENTE' || input.estado === 'LIQUIDADA' || input.estado === 'ANULADA' ? input.estado : undefined,
  };
}

function parseLiquidacionFilters(input: Record<string, unknown>): LiquidacionLecheFilters {
  return {
    clienteId: parseOptionalId(input.clienteId, 'clienteId'),
    mes: parseOptionalNumber(input.mes, 'mes'),
    anio: parseOptionalNumber(input.anio, 'anio'),
  };
}

function periodoRange(mes: number, anio: number) {
  const desde = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
  const hasta = new Date(anio, mes, 0, 23, 59, 59, 999);
  return { desde, hasta };
}

function totalLitrosEntregados(entregas: EntregaLecheWithRelations[]) {
  return entregas.reduce(
    (total, entrega) => total + entrega.ordenes.reduce((subtotal, detalle) => subtotal + toNumber(detalle.litrosEntregados), 0),
    0,
  );
}

function parseOrdeneIds(input: unknown) {
  if (!Array.isArray(input) || input.length === 0) throw new AppError('Debe seleccionar al menos un ordeñe.', 400);
  const ids = input.map((value) => parseId(value, 'ordeneId'));
  if (new Set(ids).size !== ids.length) throw new AppError('No se puede repetir el mismo ordeñe en un retiro.', 400);
  return ids;
}

async function validateCliente(clienteId: number) {
  const cliente = await findClienteForVenta(clienteId);
  if (!cliente) throw new AppError('Empresa compradora no encontrada.', 404);
  if (!cliente.activo) throw new AppError('No se pueden registrar retiros para empresas inactivas.', 400);
  return cliente;
}

async function buildEntregaOrdenes(ordeneIds: number[], excludeEntregaId?: number) {
  const [ordenes, asignadas] = await Promise.all([findOrdenesByIds(ordeneIds), findOrdenesAsignadas(ordeneIds, excludeEntregaId)]);
  if (ordenes.length !== ordeneIds.length) throw new AppError('Uno o más ordeñes no existen o están inactivos.', 404);
  if (asignadas.length > 0) {
    const asignada = asignadas[0];
    throw new AppError(`El ordeñe del ${formatDateLabel(asignada.ordene.fecha)} - ${turnoLabel(asignada.ordene.turno)} ya fue asignado a un retiro activo.`, 409);
  }

  return ordeneIds.map((ordeneId) => {
    const ordene = ordenes.find((item) => item.id === ordeneId);
    if (!ordene) throw new AppError('Uno o más ordeñes no existen o están inactivos.', 404);
    const litrosEntregados = new Prisma.Decimal(ordene.litrosBuenos).toDecimalPlaces(2);
    if (litrosEntregados.lte(0)) throw new AppError('Solo se pueden entregar ordeñes con litros buenos mayores a cero.', 400);
    return { ordeneId, litrosEntregados };
  });
}

export async function listEntregas(query: Record<string, unknown>) {
  const filters = parseEntregaFilters(query);
  const entregas = await findEntregasLeche(filters);
  return filters.estado ? entregas : entregas.filter((entrega) => entrega.estado !== EstadoEntregaLeche.ANULADA);
}

export async function listOrdenesDisponibles() {
  return findOrdenesDisponiblesParaEntrega();
}

export async function createNewEntrega(input: Record<string, unknown>, usuarioId?: number) {
  const clienteId = parseId(input.clienteId, 'empresa');
  await validateCliente(clienteId);
  const ordenes = await buildEntregaOrdenes(parseOrdeneIds(input.ordeneIds));

  try {
    return await createEntregaLeche({
      clienteId,
      fechaRetiro: parseDate(input.fechaRetiro, 'Fecha de retiro'),
      observacion: normalizeOptionalString(input.observacion, 'Observación'),
      usuarioId,
      ordenes,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Este ordeñe ya fue asignado a una empresa.', 409);
    }
    throw error;
  }
}

export async function updateExistingEntrega(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de retiro');
  const existing = await findEntregaLecheById(id);
  if (!existing) throw new AppError('Retiro de leche no encontrado.', 404);
  if (existing.estado !== EstadoEntregaLeche.PENDIENTE) throw new AppError('Solo se pueden editar retiros pendientes de liquidar.', 400);

  const clienteId = parseId(input.clienteId, 'empresa');
  await validateCliente(clienteId);
  const ordenes = await buildEntregaOrdenes(parseOrdeneIds(input.ordeneIds), id);

  try {
    return await updateEntregaLeche(id, {
      clienteId,
      fechaRetiro: parseDate(input.fechaRetiro, 'Fecha de retiro'),
      observacion: normalizeOptionalString(input.observacion, 'Observación'),
      ordenes,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Este ordeñe ya fue asignado a una empresa.', 409);
    }
    throw error;
  }
}

export async function deleteExistingEntrega(idParam: string) {
  const id = parseId(idParam, 'Id de retiro');
  const existing = await findEntregaLecheById(id);
  if (!existing) throw new AppError('Retiro de leche no encontrado.', 404);
  if (existing.estado === EstadoEntregaLeche.LIQUIDADA || existing.liquidacionId) {
    throw new AppError('No se puede eliminar un retiro que ya fue liquidado.', 400);
  }
  return deleteEntregaLeche(id);
}

export async function listLiquidaciones(query: Record<string, unknown>) {
  return findLiquidacionesLeche(parseLiquidacionFilters(query));
}

export async function getSugerenciaLiquidacion(query: Record<string, unknown>) {
  const clienteId = parseId(query.clienteId, 'empresa');
  const mes = parseMes(query.mes);
  const anio = parseAnio(query.anio);
  const { desde, hasta } = periodoRange(mes, anio);
  const entregas = await findEntregasPendientesPeriodo(clienteId, desde, hasta);
  return {
    litrosSugeridos: totalLitrosEntregados(entregas),
    cantidadRetiros: entregas.length,
    entregas,
  };
}

export async function createNewLiquidacion(input: Record<string, unknown>, usuarioId?: number) {
  const clienteId = parseId(input.clienteId, 'empresa');
  await validateCliente(clienteId);
  const mes = parseMes(input.mes);
  const anio = parseAnio(input.anio);
  const numero = normalizeRequiredString(input.numero, 'Número de liquidación');
  const precioLitro = parsePositiveDecimal(input.precioLitro, 'Precio por litro');
  const litrosLiquidados = parseDecimal(input.litrosLiquidados, 'Litros liquidados', 0);
  const existing = await findLiquidacionLecheByPeriodo(clienteId, mes, anio);
  if (existing) throw new AppError('Ya existe una liquidación para esta empresa y período.', 409);

  const { desde, hasta } = periodoRange(mes, anio);
  const entregas = await findEntregasPendientesPeriodo(clienteId, desde, hasta);
  if (entregas.length === 0) throw new AppError('No existen retiros pendientes para esta empresa y período.', 400);

  return createLiquidacionLeche({
    clienteId,
    mes,
    anio,
    numero,
    fechaLiquidacion: parseDate(input.fechaLiquidacion, 'Fecha de liquidación'),
    precioLitro,
    litrosLiquidados,
    importeTotal: litrosLiquidados.mul(precioLitro).toDecimalPlaces(2),
    observacion: normalizeOptionalString(input.observacion, 'Observación'),
    usuarioId,
    entregaIds: entregas.map((entrega) => entrega.id),
  });
}

export async function updateExistingLiquidacion(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de liquidación');
  const existing = await findLiquidacionLecheById(id);
  if (!existing) throw new AppError('Liquidación no encontrada.', 404);

  const numero = normalizeRequiredString(input.numero, 'Número de liquidación');
  const precioLitro = parsePositiveDecimal(input.precioLitro, 'Precio por litro');
  const litrosLiquidados = parseDecimal(input.litrosLiquidados, 'Litros liquidados', 0);

  return updateLiquidacionLeche(id, {
    numero,
    fechaLiquidacion: parseDate(input.fechaLiquidacion, 'Fecha de liquidación'),
    precioLitro,
    litrosLiquidados,
    importeTotal: litrosLiquidados.mul(precioLitro).toDecimalPlaces(2),
    observacion: normalizeOptionalString(input.observacion, 'Observación'),
  });
}

export async function getResumenVentas() {
  const now = new Date();
  const { desde, hasta } = periodoRange(now.getMonth() + 1, now.getFullYear());
  const [entregasMes, entregasPendientes, liquidacionesMes] = await Promise.all([
    findEntregasLeche({ fechaDesde: desde, fechaHasta: hasta }),
    findEntregasLeche({ estado: EstadoEntregaLeche.PENDIENTE }),
    findLiquidacionesLeche({ mes: now.getMonth() + 1, anio: now.getFullYear() }),
  ]);

  return {
    litrosEntregadosMes: totalLitrosEntregados(entregasMes.filter((entrega) => entrega.estado !== EstadoEntregaLeche.ANULADA)),
    retirosPendientes: entregasPendientes.length,
    liquidacionesMes: liquidacionesMes.length,
    importeLiquidadoMes: liquidacionesMes.reduce((total, liquidacion) => total + toNumber(liquidacion.importeTotal), 0),
  };
}
