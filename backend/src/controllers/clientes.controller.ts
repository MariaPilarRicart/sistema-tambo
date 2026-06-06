import type { Request, Response } from 'express';
import {
  createNewCliente,
  getCliente,
  listClientes,
  updateClienteEstado,
  updateExistingCliente,
} from '../services/clientes.service';

export async function listClientesController(request: Request, response: Response) {
  response.status(200).json({ clientes: await listClientes(request.query as Record<string, unknown>) });
}

export async function getClienteController(request: Request, response: Response) {
  response.status(200).json({ cliente: await getCliente(String(request.params.id)) });
}

export async function createClienteController(request: Request, response: Response) {
  response.status(201).json({ cliente: await createNewCliente(request.body ?? {}) });
}

export async function updateClienteController(request: Request, response: Response) {
  response.status(200).json({ cliente: await updateExistingCliente(String(request.params.id), request.body ?? {}) });
}

export async function updateClienteEstadoController(request: Request, response: Response) {
  response.status(200).json({ cliente: await updateClienteEstado(String(request.params.id), request.body ?? {}) });
}
