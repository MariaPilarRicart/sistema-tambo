export interface Cliente {
  id: number;
  cuit: string;
  razonSocial: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  fechaAlta: string;
  activo: boolean;
  movimientosAsociados?: number;
  puedeEliminar?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteVentaLegacy {
  id: number;
  numeroFactura: string;
  fechaVenta: string;
  totalLitros: number | string;
  precioTotal: number | string;
}

export interface ClienteDetalle extends Cliente {
  ventas: ClienteVentaLegacy[];
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
  cuit?: string;
  razonSocial?: string;
  direccion: string;
  telefono: string;
  email: string;
  activo: boolean;
}

