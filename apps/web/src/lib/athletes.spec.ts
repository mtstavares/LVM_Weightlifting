import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAthlete, getOwnAthleteProfile, listAthletes } from './athletes';

afterEach(() => vi.restoreAllMocks());

describe('athletes api client', () => {
  it('lists, creates and loads own profile', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
    );

    await listAthletes();
    await createAthlete({ fullName: 'Joao Silva', email: 'joao@lvm.local' });
    await getOwnAthleteProfile();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns backend errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    await expect(listAthletes()).rejects.toThrow('Forbidden');
  });
});
