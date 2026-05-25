import { apiRequest } from './apiClient';
import type {
  AlimentacionResumen,
  Racion,
  RacionFormValues,
  RegistroAlimentacion,
  RegistroAlimentacionFormValues,
} from '../types/alimentacion';

interface RacionesResponse {
  raciones: Racion[];
}

interface RacionResponse {
  racion: Racion;
}

interface RegistrosResponse {
  registros: RegistroAlimentacion[];
}

interface RegistroResponse {
  registro: RegistroAlimentacion;
}

interface ResumenResponse {
  resumen: AlimentacionResumen;
}

function buildRacionPayload(values: RacionFormValues) {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
    activa: values.activa,
  };
}

function buildRegistroPayload(values: RegistroAlimentacionFormValues) {
  return {
    fecha: values.fecha,
    loteId: Number(values.loteId),
    racionId: Number(values.racionId),
    cantidadKg: Number(values.cantidadKg),
    observaciones: values.observaciones.trim() || null,
  };
}

export async function getRaciones(token: string) {
  const response = await apiRequest<RacionesResponse>('/alimentacion/raciones', { token });
  return response.raciones;
}

export async function createRacion(token: string, values: RacionFormValues) {
  const response = await apiRequest<RacionResponse>('/alimentacion/raciones', {
    method: 'POST',
    token,
    body: JSON.stringify(buildRacionPayload(values)),
  });
  return response.racion;
}

export async function updateRacion(token: string, id: number, values: RacionFormValues) {
  const response = await apiRequest<RacionResponse>(`/alimentacion/raciones/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(buildRacionPayload(values)),
  });
  return response.racion;
}

export async function deactivateRacion(token: string, id: number) {
  const response = await apiRequest<RacionResponse>(`/alimentacion/raciones/${id}`, {
    method: 'DELETE',
    token,
  });
  return response.racion;
}

export async function getRegistrosAlimentacion(token: string) {
  const response = await apiRequest<RegistrosResponse>('/alimentacion/registros', { token });
  return response.registros;
}

export async function createRegistroAlimentacion(token: string, values: RegistroAlimentacionFormValues) {
  const response = await apiRequest<RegistroResponse>('/alimentacion/registros', {
    method: 'POST',
    token,
    body: JSON.stringify(buildRegistroPayload(values)),
  });
  return response.registro;
}

export async function getResumenAlimentacion(token: string) {
  const response = await apiRequest<ResumenResponse>('/alimentacion/resumen', { token });
  return response.resumen;
}
