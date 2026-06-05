import { apiRequest } from './apiClient';
import type { Cliente, ClienteCreateValues, ClienteDetalle, ClienteEditValues } from '../types/clientes';

interface ClientesResponse {
  clientes: Cliente[];
}

interface ClienteResponse {
  cliente: ClienteDetalle;
}

interface ClienteSimpleResponse {
  cliente: Cliente;
}

function buildCreatePayload(values: ClienteCreateValues) {
  return {
    cuit: values.cuit.trim(),
    razonSocial: values.razonSocial.trim(),
    direccion: values.direccion.trim() || null,
    telefono: values.telefono.trim() || null,
    email: values.email.trim() || null,
  };
}

function buildEditPayload(values: ClienteEditValues) {
  return {
    direccion: values.direccion.trim() || null,
    telefono: values.telefono.trim() || null,
    email: values.email.trim() || null,
    activo: values.activo,
  };
}

export async function getClientes(token: string) {
  const response = await apiRequest<ClientesResponse>('/api/clientes', { token });
  return response.clientes;
}

export async function getCliente(token: string, id: number) {
  const response = await apiRequest<ClienteResponse>(`/api/clientes/${id}`, { token });
  return response.cliente;
}

export async function createCliente(token: string, values: ClienteCreateValues) {
  const response = await apiRequest<ClienteSimpleResponse>('/api/clientes', {
    method: 'POST',
    token,
    body: JSON.stringify(buildCreatePayload(values)),
  });
  return response.cliente;
}

export async function updateCliente(token: string, id: number, values: ClienteEditValues) {
  const response = await apiRequest<ClienteSimpleResponse>(`/api/clientes/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(buildEditPayload(values)),
  });
  return response.cliente;
}

export async function updateClienteEstado(token: string, id: number, activo: boolean) {
  const response = await apiRequest<ClienteSimpleResponse>(`/api/clientes/${id}/estado`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ activo }),
  });
  return response.cliente;
}

