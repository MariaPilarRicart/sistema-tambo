import type { Venta } from './ventas';

export interface Cliente {
  id: number;
  cuit: string;
  razonSocial: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  fechaAlta: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteDetalle extends Cliente {
  ventas: Venta[];
  resumen: {
    cantidadVentas: number;
    litrosComprados: number;
    importeTotalComprado: number;
  };
}

export interface ClienteCreateValues {
  cuit: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  email: string;
}

export interface ClienteEditValues {
  direccion: string;
  telefono: string;
  email: string;
  activo: boolean;
}

