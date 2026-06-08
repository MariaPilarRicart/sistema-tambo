import OpenAI from 'openai';
import { env } from '../config/env';

interface AssistantCompletionInput {
  mensaje: string;
  rol: string;
  intencion: string;
  datosUsados: unknown[];
}

interface OpenAiTextResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}

const systemPrompt = [
  'Sos un asistente de gestion de un tambo.',
  'Responde siempre en espanol.',
  'Usa solamente los datos proporcionados en el contexto.',
  'No inventes datos.',
  'Si falta informacion, indicalo claramente.',
  'Respeta permisos por rol.',
  'No podes crear, editar ni eliminar registros.',
  'Solo podes analizar, explicar y recomendar.',
].join(' ');

function logOpenAiConfiguration() {
  console.info('[OpenAI] OPENAI_API_KEY configurada:', env.openaiApiKey ? 'si' : 'no');
  console.info('[OpenAI] OPENAI_MODEL usado:', env.openaiModel);
}

function getOpenAiClient() {
  if (!env.openaiApiKey) return null;
  return new OpenAI({ apiKey: env.openaiApiKey });
}

function extractResponseText(response: unknown) {
  const payload = response as OpenAiTextResponse;

  return payload.output_text
    || (payload.output ?? [])
      .flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? '')
      .filter(Boolean)
      .join('\n');
}

function getOpenAiErrorDetails(error: unknown) {
  const maybeError = error as {
    status?: number;
    code?: string;
    type?: string;
    name?: string;
    message?: string;
    error?: {
      code?: string;
      type?: string;
      message?: string;
    };
  };

  const status = maybeError.status;
  const code = maybeError.code ?? maybeError.error?.code;
  const type = maybeError.type ?? maybeError.error?.type;
  const name = maybeError.name;
  const message = maybeError.message ?? maybeError.error?.message ?? '';

  return { status, code, type, name, message };
}

function logOpenAiError(error: unknown) {
  const details = getOpenAiErrorDetails(error);

  console.error('[OpenAI] Error al consultar OpenAI:', {
    status: details.status ?? 'sin status',
    code: details.code ?? 'sin code',
    type: details.type ?? 'sin type',
    name: details.name ?? 'sin name',
    message: details.message || 'sin mensaje',
  });
}

function classifyOpenAiError(error: unknown) {
  const details = getOpenAiErrorDetails(error);
  const message = normalizeForMatch(details.message);
  const code = normalizeForMatch(details.code ?? '');
  const type = normalizeForMatch(details.type ?? '');
  const name = normalizeForMatch(details.name ?? '');

  if (
    code.includes('insufficient_quota')
    || code.includes('billing')
    || message.includes('insufficient_quota')
    || message.includes('billing')
    || message.includes('credit')
    || message.includes('quota')
  ) {
    return 'Tu cuenta de OpenAI no tiene crédito o facturación activa.';
  }

  if (
    code.includes('model_not_found')
    || details.status === 404
    || message.includes('model')
    || message.includes('modelo')
  ) {
    return 'El modelo configurado no es válido o no está disponible.';
  }

  if (
    name.includes('apiconnectionerror')
    || name.includes('api connection')
    || code.includes('enotfound')
    || code.includes('econnreset')
    || code.includes('etimedout')
    || type.includes('connection')
    || message.includes('connection')
    || message.includes('network')
    || message.includes('fetch failed')
  ) {
    return 'No se pudo conectar con OpenAI.';
  }

  return 'No pude consultar el proveedor de IA en este momento.';
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export async function generateAssistantResponse(input: AssistantCompletionInput) {
  logOpenAiConfiguration();

  const client = getOpenAiClient();

  if (!client) {
    return 'El Asistente IA no está configurado. Agregá OPENAI_API_KEY en el .env del backend.';
  }

  try {
    const response = await client.responses.create({
      model: env.openaiModel,
      input: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: JSON.stringify({
            pregunta: input.mensaje,
            rol: input.rol,
            intencion: input.intencion,
            datosPermitidos: input.datosUsados,
          }),
        },
      ],
      temperature: 0.2,
    });

    return extractResponseText(response) || 'No pude generar una respuesta con los datos disponibles.';
  } catch (error) {
    logOpenAiError(error);
    return classifyOpenAiError(error);
  }
}
