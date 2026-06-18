import { afterEach, describe, expect, it, vi } from 'vitest';
import { listAuditLogs } from './audit-logs';

afterEach(() => vi.restoreAllMocks());

describe('audit logs api client', () => {
  it('loads filtered logs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    await listAuditLogs({
      athleteId: 'athlete-1',
      event: 'ATHLETE_DEACTIVATED',
      result: 'SUCCESS'
    });
    expect(fetchMock.mock.calls[0][0]).toContain('athleteId=athlete-1');
  });

  it('rejects failed requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    await expect(listAuditLogs()).rejects.toThrow('Nao foi possivel carregar os logs.');
  });
});
