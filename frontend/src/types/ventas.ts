import type { Cliente } from './clientes';
import type { AuthUser } from './auth';
import type { LoteLeche } from './produccion';

export interface VentaDetalle {
  id: number;
  ventaId: number;
  loteLecheId: number;
  litrosVendidos: number | string;
  precioUnitario: number | string;
  subtotal: number | string;
  loteLeche: LoteLeche;
}

export interface Venta {
  id: number;
  clienteId: number;
  numeroFactura: string;
  fechaVenta: string;
  totalLitros: number | string;
  precioTotal: number | string;
  observaciones: string | null;
  usuarioId: number;
  createdAt: string;
  updatedAt: string;
  cliente: Cliente;
  usuario: Pick<AuthUser, 'id' | 'username'> & { nombre: string; rol: AuthUser['role'] };
  detalles: VentaDetalle[];
}

export interface LoteLecheDisponible extends LoteLeche {
  litrosVendidos: number;
  litrosDisponibles: number;
  estadoCalculado: LoteLeche['estado'];
  ventasAsociadas: Venta[];
}

export interface VentaDetalleFormValues {
  loteLecheId: string;
  litrosVendidos: string;
  precioUnitario: string;
}

export interface VentaFormValues {
  clienteId: string;
  numeroFactura: string;
  fechaVenta: string;
  observaciones: string;
  detalles: VentaDetalleFormValues[];
}

export interface VentaFilters {
  clienteId: string;
  fechaDesde: string;
  fechaHasta: string;
  factura: string;
}

