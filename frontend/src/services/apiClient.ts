const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface ApiRequestOptions extends RequestInit {
  token?: string | null;
}

export const DATA_CHANGED_EVENT = 'sistema-tambo:data-changed';

function isMutation(method: string | undefined) {
  const normalizedMethod = (method ?? 'GET').toUpperCase();
  return normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD';
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured yet.');
  }

  const { token, headers, ...requestOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    const message = errorBody?.message ?? `API request failed with status ${response.status}`;

    throw new ApiError(message, response.status);
  }

  const responseBody = await response.json() as TResponse;

  if (isMutation(requestOptions.method) && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, {
      detail: {
        method: requestOptions.method ?? 'GET',
        path,
      },
    }));
  }

  return responseBody;
}
