import { EstadoLoteLeche, Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createVentaConDetalles,
  findClienteForVenta,
  findLotesLecheConVentas,
  findLotesLecheForVenta,
  findVentaByFactura,
  findVentaById,
  findVentaDetallesByLoteIds,
  findVentas,
  type VentaFilters,
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
  return date;
}

function parseDateFilter(value: unknown, endOfDay = false) {
  if (value === undefined || value === null || value === '') return undefined;
  const date = parseDate(value, 'Fecha de filtro');
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date;
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

function parseDecimal(value: unknown, fieldName: string, options: { min?: number; exclusiveMin?: number } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new AppError(`${fieldName} inválido.`, 400);
  if (options.min !== undefined && parsed < options.min) throw new AppError(`${fieldName} debe ser mayor o igual a ${options.min}.`, 400);
  if (options.exclusiveMin !== undefined && parsed <= options.exclusiveMin) {
    throw new AppError(`${fieldName} debe ser mayor a ${options.exclusiveMin}.`, 400);
  }
  return new Prisma.Decimal(parsed);
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function isExpired(fechaVencimiento: Date, fechaVenta = new Date()) {
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(23, 59, 59, 999);
  return fechaVenta > vencimiento;
}

function parseFilters(input: Record<string, unknown>): VentaFilters {
  return {
    clienteId: parseOptionalId(input.clienteId, 'clienteId'),
    fechaDesde: parseDateFilter(input.fechaDesde),
    fechaHasta: parseDateFilter(input.fechaHasta, true),
    factura: typeof input.factura === 'string' && input.factura.trim() ? input.factura.trim() : undefined,
  };
}

function parseDetalles(input: unknown) {
  if (!Array.isArray(input) || input.length === 0) throw new AppError('La venta debe tener al menos un detalle.', 400);

  return input.map((item, index) => {
    if (!item || typeof item !== 'object') throw new AppError(`Detalle ${index + 1} inválido.`, 400);
    const detalle = item as Record<string, unknown>;
    const litrosVendidos = parseDecimal(detalle.litrosVendidos, `Litros vendidos del detalle ${index + 1}`, { exclusiveMin: 0 });
    const precioUnitario = parseDecimal(detalle.precioUnitario, `Precio unitario del detalle ${index + 1}`, { min: 0 });
    return {
      loteLecheId: parseId(detalle.loteLecheId, `loteLecheId del detalle ${index + 1}`),
      litrosVendidos,
      precioUnitario,
      subtotal: litrosVendidos.mul(precioUnitario),
    };
  });
}

async function availabilityByLote(loteLecheIds: number[]) {
  const [lotes, ventasPorLote] = await Promise.all([findLotesLecheForVenta(loteLecheIds), findVentaDetallesByLoteIds(loteLecheIds)]);
  const soldMap = new Map(ventasPorLote.map((item) => [item.loteLecheId, toNumber(item._sum.litrosVendidos)]));
  return lotes.map((lote) => {
    const litrosVendidos = soldMap.get(lote.id) ?? 0;
    const litrosDisponibles = toNumber(lote.litrosNetos) - litrosVendidos;
    return { ...lote, litrosVendidos, litrosDisponibles };
  });
}

export async function listVentas(query: Record<string, unknown>) {
  return findVentas(parseFilters(query));
}

export async function getVenta(idParam: string) {
  const id = parseId(idParam, 'Id de venta');
  const venta = await findVentaById(id);
  if (!venta) throw new AppError('Venta no encontrada.', 404);
  return venta;
}

export async function listLotesDisponiblesParaVenta() {
  const lotes = await findLotesLecheConVentas();
  const now = new Date();
  return lotes.map((lote) => {
    const litrosVendidos = lote.ventaDetalles.reduce((total, detalle) => total + toNumber(detalle.litrosVendidos), 0);
    const litrosDisponibles = toNumber(lote.litrosNetos) - litrosVendidos;
    const estadoCalculado = isExpired(lote.fechaVencimiento, now)
      ? EstadoLoteLeche.VENCIDO
      : litrosDisponibles <= 0
        ? EstadoLoteLeche.VENDIDO
        : EstadoLoteLeche.DISPONIBLE;

    return {
      ...lote,
      litrosVendidos,
      litrosDisponibles: Math.max(litrosDisponibles, 0),
      estadoCalculado,
      ventasAsociadas: lote.ventaDetalles.map((detalle) => detalle.venta),
    };
  });
}

export async function createNewVenta(input: Record<string, unknown>, usuarioId?: number) {
  if (!usuarioId) throw new AppError('Usuario no autenticado.', 401);
  const clienteId = parseId(input.clienteId, 'clienteId');
  const numeroFactura = normalizeRequiredString(input.numeroFactura, 'Número de factura');
  const fechaVenta = parseDate(input.fechaVenta, 'Fecha de venta');
  const detalles = parseDetalles(input.detalles);

  const [cliente, existingFactura] = await Promise.all([findClienteForVenta(clienteId), findVentaByFactura(numeroFactura)]);
  if (!cliente) throw new AppError('Cliente no encontrado.', 404);
  if (!cliente.activo) throw new AppError('No se pueden registrar ventas para clientes inactivos.', 400);
  if (existingFactura) throw new AppError('Ya existe una venta con ese número de factura.', 409);

  const litrosPorLote = new Map<number, Prisma.Decimal>();
  detalles.forEach((detalle) => {
    litrosPorLote.set(detalle.loteLecheId, (litrosPorLote.get(detalle.loteLecheId) ?? new Prisma.Decimal(0)).plus(detalle.litrosVendidos));
  });

  const lotesConDisponibilidad = await availabilityByLote(Array.from(litrosPorLote.keys()));
  if (lotesConDisponibilidad.length !== litrosPorLote.size) throw new AppError('Uno o más lotes de leche no existen.', 404);

  const estadosLotes = lotesConDisponibilidad.map((lote) => {
    if (isExpired(lote.fechaVencimiento, fechaVenta) || lote.estado === EstadoLoteLeche.VENCIDO) {
      throw new AppError(`El lote ${lote.codigo} está vencido y no puede venderse.`, 400);
    }

    const litrosSolicitados = litrosPorLote.get(lote.id) ?? new Prisma.Decimal(0);
    if (litrosSolicitados.gt(lote.litrosDisponibles)) {
      throw new AppError(`No hay litros disponibles suficientes en el lote ${lote.codigo}.`, 400);
    }

    const litrosDisponiblesPosteriores = new Prisma.Decimal(lote.litrosDisponibles).minus(litrosSolicitados);
    return {
      id: lote.id,
      estado: litrosDisponiblesPosteriores.lte(0) ? EstadoLoteLeche.VENDIDO : EstadoLoteLeche.DISPONIBLE,
      fechaVenta: litrosDisponiblesPosteriores.lte(0) ? fechaVenta : null,
    };
  });

  const totalLitros = detalles.reduce((total, detalle) => total.plus(detalle.litrosVendidos), new Prisma.Decimal(0));
  const precioTotal = detalles.reduce((total, detalle) => total.plus(detalle.subtotal), new Prisma.Decimal(0));

  return createVentaConDetalles({
    clienteId,
    numeroFactura,
    fechaVenta,
    totalLitros,
    precioTotal,
    observaciones: normalizeOptionalString(input.observaciones, 'Observaciones'),
    usuarioId,
    detalles,
    estadosLotes,
  });
}

