export type AthleteStatus =
  | 'CONVITE_ENVIADO'
  | 'PRIMEIRO_LOGIN_PENDENTE'
  | 'ATIVO'
  | 'INATIVO';

export type AthleteSummary = {
  id: string;
  userId: string;
  trainerId: string;
  fullName: string;
  email: string;
  status: AthleteStatus;
  isActive: boolean;
  createdAt: string;
  firstLoginAt: string | null;
  lastPasswordChangeAt: string | null;
  lastAccessAt: string | null;
  deactivatedAt: string | null;
  deactivationReason: string | null;
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
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listAthletes(filters: { search?: string; status?: AthleteStatus } = {}) {
  const query = new URLSearchParams();
  if (filters.search) query.set('search', filters.search);
  if (filters.status) query.set('status', filters.status);
  const suffix = query.size ? `?${query}` : '';
  return request<AthleteSummary[]>(`/athletes${suffix}`);
}

export function createAthlete(input: { fullName: string; email: string }) {
  return request<AthleteSummary>('/athletes', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function deactivateAthlete(athleteId: string, reason?: string) {
  return request<AthleteSummary>(`/athletes/${athleteId}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export function reactivateAthlete(athleteId: string) {
  return request<AthleteSummary>(`/athletes/${athleteId}/reactivate`, { method: 'POST' });
}

export function resendAthleteInvitation(athleteId: string) {
  return request<void>(`/athletes/${athleteId}/resend-invitation`, { method: 'POST' });
}

export function getOwnAthleteProfile() {
  return request<AthleteSummary>('/athletes/me');
}
