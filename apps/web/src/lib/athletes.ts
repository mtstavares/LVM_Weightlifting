import { apiRequest } from './api-client';

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
  profilePhotoUrl: string | null;
  status: AthleteStatus;
  isActive: boolean;
  createdAt: string;
  firstLoginAt: string | null;
  lastPasswordChangeAt: string | null;
  lastAccessAt: string | null;
  deactivatedAt: string | null;
  deactivationReason: string | null;
};

export function listAthletes(filters: { search?: string; status?: AthleteStatus } = {}) {
  const query = new URLSearchParams();
  if (filters.search) query.set('search', filters.search);
  if (filters.status) query.set('status', filters.status);
  const suffix = query.size ? `?${query}` : '';
  return apiRequest<AthleteSummary[]>(`/athletes${suffix}`);
}

export function createAthlete(input: { fullName: string; email: string }) {
  return apiRequest<AthleteSummary>('/athletes', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function deactivateAthlete(athleteId: string, reason?: string) {
  return apiRequest<AthleteSummary>(`/athletes/${athleteId}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export function reactivateAthlete(athleteId: string) {
  return apiRequest<AthleteSummary>(`/athletes/${athleteId}/reactivate`, { method: 'POST' });
}

export function resendAthleteInvitation(athleteId: string) {
  return apiRequest<void>(`/athletes/${athleteId}/resend-invitation`, { method: 'POST' });
}
