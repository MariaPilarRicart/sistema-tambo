import type { Request, Response } from 'express';
import { chatWithAssistant } from '../services/asistente.service';

export async function chatAsistenteController(request: Request, response: Response) {
  const result = await chatWithAssistant(request.user, request.body ?? {});
  response.status(200).json(result);
}
