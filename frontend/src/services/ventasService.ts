import { apiRequest } from './apiClient';
import type { LoteLecheDisponible, Venta, VentaFilters, VentaFormValues } from '../types/ventas';

interface VentasResponse {
  ventas: Venta[];
}

interface VentaResponse {
  venta: Venta;
}

interface LotesDisponiblesResponse {
  lotesLeche: LoteLecheDisponible[];
}

function buildQuery(filters: Partial<VentaFilters>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildVentaPayload(values: VentaFormValues) {
  return {
    clienteId: Number(values.clienteId),
    numeroFactura: values.numeroFactura.trim(),
    fechaVenta: values.fechaVenta,
    observaciones: values.observaciones.trim() || null,
    detalles: values.detalles.map((detalle) => ({
      loteLecheId: Number(detalle.loteLecheId),
      litrosVendidos: Number(detalle.litrosVendidos || 0),
      precioUnitario: Number(detalle.precioUnitario || 0),
    })),
  };
}

export async function getVentas(token: string, filters: Partial<VentaFilters> = {}) {
  const response = await apiRequest<VentasResponse>(`/api/ventas${buildQuery(filters)}`, { token });
  return response.ventas;
}

export async function getVenta(token: string, id: number) {
  const response = await apiRequest<VentaResponse>(`/api/ventas/${id}`, { token });
  return response.venta;
}

export async function getLotesDisponiblesVenta(token: string) {
  const response = await apiRequest<LotesDisponiblesResponse>('/api/ventas/lotes-disponibles', { token });
  return response.lotesLeche;
}

export async function createVenta(token: string, values: VentaFormValues) {
  const response = await apiRequest<VentaResponse>('/api/ventas', {
    method: 'POST',
    token,
    body: JSON.stringify(buildVentaPayload(values)),
  });
  return response.venta;
}

