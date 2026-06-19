import { apiRequest } from './api-client';

export type AuditLog = {
  id: string;
  event: string;
  description: string;
  result: 'SUCCESS' | 'FAILURE';
  actor: { id: string; fullName: string; role: string } | null;
  affectedUser: { id: string; fullName: string; role: string } | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: unknown;
  createdAt: string;
};

export function listAuditLogs(filters: {
  athleteId?: string;
  event?: string;
  result?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
  return apiRequest<AuditLog[]>(`/audit-logs${query.size ? `?${query}` : ''}`, {
    errorMessage: 'Não foi possível carregar os logs.'
  });
}
