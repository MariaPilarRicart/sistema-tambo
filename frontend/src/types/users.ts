import type { UserRole } from './auth';

export interface User {
  id: number;
  nombre: string;
  username: string;
  email: string | null;
  rol: UserRole;
  activo: boolean;
  debeCambiarPassword: boolean;
  fotoPerfil: string | null;
  contrasenaTemporal?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserFormValues {
  nombre: string;
  username: string;
  email: string;
  password: string;
  rol: UserRole;
  activo: boolean;
}
