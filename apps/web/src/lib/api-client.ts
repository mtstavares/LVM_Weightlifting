export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type ApiRequestOptions = RequestInit & {
  errorMessage?: string;
};

async function request<T>(
  url: string,
  { errorMessage = 'Não foi possível concluir a solicitação.', ...init }: ApiRequestOptions = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers
    });
  } catch {
    throw new Error('API indisponível. Inicie o projeto pela raiz com npm run dev.');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const body = (errorText ? safeJson(errorText) : null) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    throw new Error(message ?? errorMessage);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function apiRequest<T>(path: string, options?: ApiRequestOptions) {
  return request<T>(`${API_URL}${path}`, options);
}

export function sameOriginRequest<T>(path: string, options?: ApiRequestOptions) {
  return request<T>(path, options);
}
