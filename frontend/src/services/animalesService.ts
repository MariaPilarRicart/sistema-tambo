import { apiRequest } from './apiClient';
import type { Animal, AnimalDeactivateValues, AnimalFicha, AnimalFilters, AnimalFormValues, RodeoResumen } from '../types/animales';

interface AnimalesResponse {
  animales: Animal[];
}

interface AnimalResponse {
  animal: Animal;
}

interface AnimalFichaResponse {
  animal: AnimalFicha;
}

interface RodeoResumenResponse {
  resumen: RodeoResumen;
}

function buildQuery(filters: AnimalFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `?${query}` : '';
}

function buildAnimalPayload(values: AnimalFormValues, includeCaravana: boolean) {
  return {
    ...(includeCaravana ? { caravana: values.caravana.trim() } : {}),
    nombre: values.nombre.trim() || null,
    fechaNacimiento: values.fechaNacimiento,
    raza: values.raza.trim() || null,
    categoriaAnimal: values.categoriaAnimal,
    estadoReproductivo: values.estadoReproductivo,
    estadoAnimal: values.estadoAnimal,
    activo: values.activo,
    loteId: Number(values.loteId),
    madreId: values.madreId ? Number(values.madreId) : null,
    padreNombre: values.padreNombre.trim() || null,
  };
}

export async function getAnimales(token: string, filters: AnimalFilters) {
  const response = await apiRequest<AnimalesResponse>(`/animales${buildQuery(filters)}`, { token });

  return response.animales;
}

export async function getRodeoResumen(token: string) {
  const response = await apiRequest<RodeoResumenResponse>('/animales/resumen', { token });

  return response.resumen;
}

export async function getAnimalFicha(token: string, id: number) {
  const response = await apiRequest<AnimalFichaResponse>(`/animales/${id}/ficha`, { token });

  return response.animal;
}

export async function createAnimal(token: string, values: AnimalFormValues) {
  const response = await apiRequest<AnimalResponse>('/animales', {
    method: 'POST',
    token,
    body: JSON.stringify(buildAnimalPayload(values, true)),
  });

  return response.animal;
}

export async function updateAnimal(token: string, id: number, values: AnimalFormValues) {
  const response = await apiRequest<AnimalResponse>(`/animales/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(buildAnimalPayload(values, false)),
  });

  return response.animal;
}

export async function deactivateAnimal(token: string, id: number, values: AnimalDeactivateValues) {
  const response = await apiRequest<AnimalResponse>(`/animales/${id}`, {
    method: 'DELETE',
    token,
    body: JSON.stringify({
      estadoAnimal: values.estadoAnimal,
      observacionesBaja: values.observacionesBaja.trim() || null,
    }),
  });

  return response.animal;
}
