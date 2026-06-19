import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  completeProfile,
  getOwnProfile,
  getTrainerAthleteProfile,
  listPersonalRecords,
  resolveProfilePhoto,
  updateProfile,
  upsertPersonalRecord
} from './athlete-profile';

afterEach(() => vi.restoreAllMocks());

function response(body: unknown = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

const input = {
  fullName: 'Joao Silva',
  birthDate: '2000-01-01',
  sex: 'MALE' as const,
  weightCategory: '70',
  competitiveLevel: 'NATIONAL' as const
};

describe('athlete profile api client', () => {
  it('calls profile, trainer and personal record endpoints', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => response([]));
    const photo = new File(['photo'], 'photo.png', { type: 'image/png' });

    await getOwnProfile();
    await completeProfile(input, photo);
    await updateProfile(input);
    await updateProfile(input, photo);
    await getTrainerAthleteProfile('athlete-1');
    await listPersonalRecords();
    await upsertPersonalRecord('SNATCH', {
      weight: 100,
      recordDate: '2026-06-01',
      notes: 'Competition'
    });

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock.mock.calls[1][1]?.body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls[4][0]).toContain('/athletes/athlete-1/profile');
    expect(fetchMock.mock.calls[6][0]).toContain('/personal-records/SNATCH');
  });

  it('resolves photo URLs and reports validation errors', async () => {
    expect(resolveProfilePhoto('/storage/photos/photo.png')).toContain(
      '/storage/photos/photo.png'
    );
    expect(resolveProfilePhoto(null)).toBeNull();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({ message: ['birthDate must be valid', 'photo is required'] }, 400)
    );
    await expect(getOwnProfile()).rejects.toThrow(
      'birthDate must be valid photo is required'
    );
  });
});
