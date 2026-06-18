export type AthleteSummary = {
  id: string;
  userId: string;
  trainerId: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Falha na solicitacao.');
  }
  return response.json() as Promise<T>;
}

export function listAthletes() {
  return request<AthleteSummary[]>('/athletes');
}

export function createAthlete(input: { fullName: string; email: string }) {
  return request<AthleteSummary>('/athletes', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function getOwnAthleteProfile() {
  return request<AthleteSummary>('/athletes/me');
}
