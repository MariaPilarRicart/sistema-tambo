import { apiRequest } from './apiClient';
import type {
  AuthUser,
  BackendAuthUser,
  BackendLoginResponse,
  BackendMeResponse,
  LoginCredentials,
  LoginResponse,
} from '../types/auth';

const TOKEN_STORAGE_KEY = 'tampo.auth.token';

function mapBackendUser(user: BackendAuthUser): AuthUser {
  return {
    id: user.id,
    name: user.nombre,
    username: user.username,
    role: user.rol,
  };
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiRequest<BackendLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  return {
    token: response.token,
    user: mapBackendUser(response.user),
  };
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const response = await apiRequest<BackendMeResponse>('/auth/me', {
    method: 'GET',
    token,
  });

  return mapBackendUser(response.user);
}

export function saveAuthToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getStoredAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}
