import type { RolUsuario } from '@prisma/client';

export interface AuthTokenPayload {
  id: number;
  nombre: string;
  rol: RolUsuario;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: number;
  nombre: string;
  username: string;
  rol: RolUsuario;
}
