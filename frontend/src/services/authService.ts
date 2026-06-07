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
    email: user.email,
    role: user.rol,
    active: user.activo ?? true,
    createdAt: user.createdAt ?? null,
    mustChangePassword: user.debeCambiarPassword,
    profilePhoto: user.fotoPerfil,
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

export async function updateProfile(token: string, values: { nombre: string; email?: string | null; fotoPerfil?: string | null }) {
  const response = await apiRequest<BackendMeResponse>('/auth/profile', {
    method: 'PATCH',
    token,
    body: JSON.stringify(values),
  });

  return mapBackendUser(response.user);
}

export async function changePassword(
  token: string,
  values: { currentPassword?: string; newPassword: string; confirmPassword: string },
) {
  const response = await apiRequest<BackendMeResponse>('/auth/change-password', {
    method: 'POST',
    token,
    body: JSON.stringify(values),
  });

  return mapBackendUser(response.user);
}

export async function changeRequiredPassword(
  token: string,
  values: { newPassword: string; confirmPassword: string },
) {
  const response = await apiRequest<BackendMeResponse>('/auth/change-required-password', {
    method: 'POST',
    token,
    body: JSON.stringify(values),
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
