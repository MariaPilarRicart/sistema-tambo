import bcrypt from 'bcrypt';
import { Prisma, RolUsuario } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createUser,
  deactivateUser,
  findUserById,
  findUserByUsername,
  findUsers,
  resetUserPassword,
  updateUser,
} from '../repositories/users.repository';

const USERNAME_EXISTS_MESSAGE = 'Ya existe un usuario con ese username.';

function parseUserId(id: string) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new AppError('Id de usuario invalido.', 400);
  }

  return parsedId;
}

function parseRole(rol: unknown): RolUsuario {
  if (rol === RolUsuario.ADMIN || rol === RolUsuario.EMPLEADO) {
    return rol;
  }

  throw new AppError('Rol invalido. Debe ser ADMIN o EMPLEADO.', 400);
}

function normalizeOptionalEmail(email: unknown) {
  if (email === undefined || email === null || email === '') {
    return null;
  }

  if (typeof email !== 'string') {
    throw new AppError('Email invalido.', 400);
  }

  return email.trim().toLowerCase();
}

function handlePrismaUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(USERNAME_EXISTS_MESSAGE, 409);
  }

  throw error;
}

export function listUsers() {
  return findUsers();
}

export async function createNewUser(input: {
  nombre?: string;
  username?: string;
  email?: string | null;
  password?: string;
  rol?: string;
  activo?: boolean;
}) {
  const nombre = input.nombre?.trim();
  const username = input.username?.trim();

  if (!nombre || !username || !input.rol) {
    throw new AppError('Nombre, username y rol son obligatorios.', 400);
  }

  const password = username;

  const existingUser = await findUserByUsername(username);

  if (existingUser) {
    throw new AppError(USERNAME_EXISTS_MESSAGE, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await createUser({
      nombre,
      username,
      email: normalizeOptionalEmail(input.email),
      passwordHash,
      rol: parseRole(input.rol),
      activo: input.activo ?? true,
      debeCambiarPassword: true,
    });

    return {
      ...user,
      contrasenaTemporal: password,
    };
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function updateExistingUser(
  idParam: string,
  input: {
    nombre?: string;
    username?: string;
    email?: string | null;
    password?: string;
    rol?: string;
    activo?: boolean;
  },
) {
  const id = parseUserId(idParam);
  const existingUser = await findUserById(id);

  if (!existingUser) {
    throw new AppError('Usuario no encontrado.', 404);
  }

  const data: Parameters<typeof updateUser>[1] = {};

  if (input.nombre !== undefined) {
    const nombre = input.nombre.trim();

    if (!nombre) {
      throw new AppError('Nombre no puede estar vacio.', 400);
    }

    data.nombre = nombre;
  }

  if (input.username !== undefined) {
    const username = input.username.trim();

    if (!username) {
      throw new AppError('Username no puede estar vacio.', 400);
    }

    data.username = username;
  }

  if (input.email !== undefined) {
    data.email = normalizeOptionalEmail(input.email);
  }

  if (input.rol !== undefined) {
    data.rol = parseRole(input.rol);
  }

  if (input.activo !== undefined) {
    data.activo = Boolean(input.activo);
  }

  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  try {
    return await updateUser(id, data);
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function resetExistingUserPassword(idParam: string) {
  const id = parseUserId(idParam);
  const existingUser = await findUserById(id);

  if (!existingUser) {
    throw new AppError('Usuario no encontrado.', 404);
  }

  const temporaryPassword = existingUser.username;
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const user = await resetUserPassword(id, passwordHash);

  return {
    ...user,
    contrasenaTemporal: temporaryPassword,
  };
}

export async function deactivateExistingUser(idParam: string) {
  const id = parseUserId(idParam);
  const existingUser = await findUserById(id);

  if (!existingUser) {
    throw new AppError('Usuario no encontrado.', 404);
  }

  return deactivateUser(id);
}
