import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getTrainerProfile,
  getTrainerFeed,
  resolveTrainerPhoto,
  updateTrainerProfile
} from './trainer-profile';

afterEach(() => vi.restoreAllMocks());

function response(body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('trainer profile api client', () => {
  it('loads and updates profile using multipart form data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response({}));
    const photo = new File(['photo'], 'trainer.png', { type: 'image/png' });

    await getTrainerProfile();
    await getTrainerFeed();
    await updateTrainerProfile(
      {
        fullName: 'Maria Silva',
        birthDate: '1990-06-10',
        gym: 'LVM Box',
        bio: 'Treinadora'
      },
      photo
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1]?.body).toBeInstanceOf(FormData);
  });

  it('resolves local and empty photo paths', () => {
    expect(resolveTrainerPhoto('/storage/photos/trainer.png')).toContain(
      '/storage/photos/trainer.png'
    );
    expect(resolveTrainerPhoto(null)).toBeNull();
  });
});
