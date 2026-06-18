export type TipoFuncionalLote =
  | 'GUACHERA'
  | 'ESCUELITA'
  | 'TERNERA_1'
  | 'TERNERA_2'
  | 'TORITOS'
  | 'TOROS'
  | 'PRODUCCION'
  | 'SECAS'
  | 'PREPARTO'
  | 'RECUPERACION';

export interface Lote {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipoFuncional: TipoFuncionalLote;
  activo: boolean;
  cantidadAnimales: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoteFormValues {
  nombre: string;
  descripcion: string;
  tipoFuncional: TipoFuncionalLote;
  activo: boolean;
}
