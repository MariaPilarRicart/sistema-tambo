export interface Lote {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  cantidadAnimales: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoteFormValues {
  nombre: string;
  descripcion: string;
  activo: boolean;
}
