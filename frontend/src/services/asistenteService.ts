import { apiRequest } from './apiClient';

export interface AssistantAction {
  label: string;
  url: string;
}

export interface AssistantChatResponse {
  respuesta: string;
  datosUsados: unknown[];
  acciones: AssistantAction[];
}

export async function sendAssistantMessage(token: string | null, mensaje: string) {
  return apiRequest<AssistantChatResponse>('/api/asistente/chat', {
    method: 'POST',
    token,
    body: JSON.stringify({ mensaje }),
  });
}
