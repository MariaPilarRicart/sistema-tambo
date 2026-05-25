import { apiRequest } from './apiClient';
import type { User, UserFormValues } from '../types/users';

interface UsersResponse {
  users: User[];
}

interface UserResponse {
  user: User;
}

function buildUserPayload(values: UserFormValues, includePassword: boolean) {
  return {
    nombre: values.nombre.trim(),
    username: values.username.trim(),
    email: values.email.trim() || null,
    ...(includePassword && values.password ? { password: values.password } : {}),
    rol: values.rol,
    activo: values.activo,
  };
}

export async function getUsers(token: string) {
  const response = await apiRequest<UsersResponse>('/users', { token });

  return response.users;
}

export async function createUser(token: string, values: UserFormValues) {
  const response = await apiRequest<UserResponse>('/users', {
    method: 'POST',
    token,
    body: JSON.stringify(buildUserPayload(values, true)),
  });

  return response.user;
}

export async function updateUser(token: string, id: number, values: UserFormValues) {
  const response = await apiRequest<UserResponse>(`/users/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(buildUserPayload(values, Boolean(values.password))),
  });

  return response.user;
}

export async function deactivateUser(token: string, id: number) {
  const response = await apiRequest<UserResponse>(`/users/${id}`, {
    method: 'DELETE',
    token,
  });

  return response.user;
}
