import type { TipoFuncionalLote } from '@prisma/client';

export const tipoFuncionalLoteValues = [
  'GUACHERA',
  'ESCUELITA',
  'TERNERA_1',
  'TERNERA_2',
  'TORITOS',
  'TOROS',
  'PRODUCCION',
  'SECAS',
  'PREPARTO',
  'RECUPERACION',
] as const satisfies readonly TipoFuncionalLote[];

export const TipoFuncionalLoteValue = {
  GUACHERA: 'GUACHERA',
  ESCUELITA: 'ESCUELITA',
  TERNERA_1: 'TERNERA_1',
  TERNERA_2: 'TERNERA_2',
  TORITOS: 'TORITOS',
  TOROS: 'TOROS',
  PRODUCCION: 'PRODUCCION',
  SECAS: 'SECAS',
  PREPARTO: 'PREPARTO',
  RECUPERACION: 'RECUPERACION',
} as const satisfies Record<TipoFuncionalLote, TipoFuncionalLote>;

export function isTipoFuncionalLote(value: unknown): value is TipoFuncionalLote {
  return tipoFuncionalLoteValues.includes(value as TipoFuncionalLote);
}
