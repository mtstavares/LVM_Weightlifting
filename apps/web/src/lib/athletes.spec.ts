import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAthlete,
  deactivateAthlete,
  listAthletes,
  reactivateAthlete,
  resendAthleteInvitation
} from './athletes';

afterEach(() => vi.restoreAllMocks());

function response(body: unknown = {}, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('athletes api client', () => {
  it('calls status, lifecycle and invitation endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response([]));
    await listAthletes({ search: 'ana', status: 'ATIVO' });
    await createAthlete({ fullName: 'Ana Silva', email: 'ana@lvm.local' });
    await deactivateAthlete('athlete-1', 'Saiu da equipe');
    await reactivateAthlete('athlete-1');
    await resendAthleteInvitation('athlete-1');
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0][0]).toContain('search=ana');
    expect(fetchMock.mock.calls[0][0]).toContain('status=ATIVO');
  });

  it('handles no-content and backend errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response(null, 204));
    await expect(resendAthleteInvitation('athlete-1')).resolves.toBeUndefined();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      response({ message: 'Forbidden' }, 403)
    );
    await expect(listAthletes()).rejects.toThrow('Forbidden');
  });
});
