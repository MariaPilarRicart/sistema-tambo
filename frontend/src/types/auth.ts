export type UserRole = 'ADMIN' | 'EMPLEADO';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string | null;
  mustChangePassword: boolean;
  profilePhoto: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface BackendAuthUser {
  id: number;
  nombre: string;
  username: string;
  email: string | null;
  rol: UserRole;
  activo: boolean;
  createdAt: string | null;
  debeCambiarPassword: boolean;
  fotoPerfil: string | null;
}

export interface BackendLoginResponse {
  token: string;
  user: BackendAuthUser;
}

export interface BackendMeResponse {
  user: BackendAuthUser;
}
