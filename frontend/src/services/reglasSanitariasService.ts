import { apiRequest } from './apiClient';

export type TipoReglaSanitaria = 'VACUNA' | 'ANALISIS';

export interface ReglaSanitaria {
  id: number;
  nombre: string;
  codigo: string;
  tipo: TipoReglaSanitaria;
  mesFijo: number | null;
  frecuenciaMeses: number;
  anticipacionMeses: number;
  activo: boolean;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReglaSanitariaFormValues {
  nombre: string;
  codigo: string;
  tipo: TipoReglaSanitaria;
  mesFijo: string;
  frecuenciaMeses: string;
  anticipacionMeses: string;
  activo: boolean;
  observaciones: string;
}

interface SanitaryRulesResponse {
  reglas: ReglaSanitaria[];
}

interface SanitaryRuleResponse {
  regla: ReglaSanitaria;
}

function buildPayload(values: ReglaSanitariaFormValues) {
  return {
    nombre: values.nombre,
    codigo: values.codigo,
    tipo: values.tipo,
    mesFijo: values.mesFijo ? Number(values.mesFijo) : null,
    frecuenciaMeses: Number(values.frecuenciaMeses),
    anticipacionMeses: Number(values.anticipacionMeses),
    activo: values.activo,
    observaciones: values.observaciones.trim() || null,
  };
}

export async function getReglasSanitarias(token: string) {
  const response = await apiRequest<SanitaryRulesResponse>('/api/configuracion/reglas-sanitarias', { token });
  return response.reglas;
}

export async function createReglaSanitaria(token: string, values: ReglaSanitariaFormValues) {
  const response = await apiRequest<SanitaryRuleResponse>('/api/configuracion/reglas-sanitarias', {
    method: 'POST',
    token,
    body: JSON.stringify(buildPayload(values)),
  });
  return response.regla;
}

export async function updateReglaSanitaria(token: string, id: number, values: ReglaSanitariaFormValues) {
  const response = await apiRequest<SanitaryRuleResponse>(`/api/configuracion/reglas-sanitarias/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(buildPayload(values)),
  });
  return response.regla;
}
