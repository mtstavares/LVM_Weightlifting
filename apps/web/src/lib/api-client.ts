const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
export const API_URL = configuredApiUrl ?? '/api';

type ApiRequestOptions = RequestInit & {
  errorMessage?: string;
};

const REQUEST_TIMEOUT_MS = 30_000;

async function request<T>(
  url: string,
  { errorMessage = 'Não foi possível concluir a solicitação.', ...init }: ApiRequestOptions = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  const timeoutController = new AbortController();
  const timeoutId = globalThis.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers,
      signal: init.signal ?? timeoutController.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A solicitação demorou demais para responder. Verifique a API e tente novamente.');
    }
    throw new Error('API indisponível. Inicie o projeto pela raiz com npm run dev.');
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const body = (errorText ? safeJson(errorText) : null) as
      | { error?: string; message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    const fallback = body?.error ?? message ?? productionApiHint(url, response.status) ?? errorMessage;
    throw new Error(fallback);
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
  if (!configuredApiUrl && process.env.NODE_ENV === 'production') {
    throw new Error('API de produção não configurada. Defina NEXT_PUBLIC_API_URL na Vercel e faça novo deploy.');
  }
  return request<T>(`${API_URL}${path}`, options);
}

export function sameOriginRequest<T>(path: string, options?: ApiRequestOptions) {
  return request<T>(path, options);
}

function productionApiHint(url: string, status: number): string | null {
  if (process.env.NODE_ENV !== 'production') return null;
  if (status === 404 && url.startsWith('/api/')) {
    return 'API não encontrada. Confira NEXT_PUBLIC_API_URL na Vercel e faça novo deploy.';
  }
  return `Não foi possível concluir a solicitação. Código HTTP ${status}.`;
}
