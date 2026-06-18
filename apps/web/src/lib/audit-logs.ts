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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export async function listAuditLogs(filters: {
  athleteId?: string;
  event?: string;
  result?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
  const response = await fetch(`${API_URL}/audit-logs${query.size ? `?${query}` : ''}`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Nao foi possivel carregar os logs.');
  return response.json() as Promise<AuditLog[]>;
}
