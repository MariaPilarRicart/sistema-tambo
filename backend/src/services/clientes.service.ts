import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createCliente,
  findClienteByCuit,
  findClienteById,
  findClientes,
  updateCliente,
} from '../repositories/clientes.repository';

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} inválido.`, 400);
  return parsed;
}

function parseOptionalBoolean(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new AppError(`${fieldName} inválido.`, 400);
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

function handleUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError('Ya existe un cliente con ese CUIT.', 409);
  }

  throw error;
}

function resumenCliente(ventas: NonNullable<Awaited<ReturnType<typeof findClienteById>>>['ventas']) {
  return ventas.reduce(
    (resumen, venta) => ({
      cantidadVentas: resumen.cantidadVentas + 1,
      litrosComprados: resumen.litrosComprados + Number(venta.totalLitros),
      importeTotalComprado: resumen.importeTotalComprado + Number(venta.precioTotal),
    }),
    { cantidadVentas: 0, litrosComprados: 0, importeTotalComprado: 0 },
  );
}

export function listClientes(query: Record<string, unknown> = {}) {
  const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined;
  const activo = parseOptionalBoolean(query.activo, 'Filtro activo');
  return findClientes(search, activo);
}

export async function getCliente(idParam: string) {
  const id = parseId(idParam, 'Id de cliente');
  const cliente = await findClienteById(id);
  if (!cliente) throw new AppError('Cliente no encontrado.', 404);
  return { ...cliente, resumen: resumenCliente(cliente.ventas) };
}

export async function createNewCliente(input: Record<string, unknown>) {
  const cuit = normalizeRequiredString(input.cuit, 'CUIT');
  const razonSocial = normalizeRequiredString(input.razonSocial, 'Razón social');
  const existing = await findClienteByCuit(cuit);
  if (existing) throw new AppError('Ya existe un cliente con ese CUIT.', 409);

  try {
    return await createCliente({
      cuit,
      razonSocial,
      direccion: normalizeOptionalString(input.direccion, 'Dirección'),
      telefono: normalizeOptionalString(input.telefono, 'Teléfono'),
      email: normalizeOptionalString(input.email, 'Email'),
      activo: true,
    });
  } catch (error) {
    handleUniqueError(error);
  }
}

export async function updateExistingCliente(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de cliente');
  const existing = await findClienteById(id);
  if (!existing) throw new AppError('Cliente no encontrado.', 404);
  if (input.cuit !== undefined || input.razonSocial !== undefined || input.fechaAlta !== undefined) {
    throw new AppError('CUIT, razón social y fecha de alta no pueden modificarse.', 400);
  }

  return updateCliente(id, {
    direccion: input.direccion !== undefined ? normalizeOptionalString(input.direccion, 'Dirección') : undefined,
    telefono: input.telefono !== undefined ? normalizeOptionalString(input.telefono, 'Teléfono') : undefined,
    email: input.email !== undefined ? normalizeOptionalString(input.email, 'Email') : undefined,
    activo: input.activo !== undefined ? Boolean(input.activo) : undefined,
  });
}

export async function updateClienteEstado(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de cliente');
  const existing = await findClienteById(id);
  if (!existing) throw new AppError('Cliente no encontrado.', 404);
  if (typeof input.activo !== 'boolean') throw new AppError('Estado activo es obligatorio.', 400);
  return updateCliente(id, { activo: input.activo });
}
