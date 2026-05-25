export type UserRole = 'ADMIN' | 'EMPLEADO';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: UserRole;
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
  rol: UserRole;
}

export interface BackendLoginResponse {
  token: string;
  user: BackendAuthUser;
}

export interface BackendMeResponse {
  user: BackendAuthUser;
}
