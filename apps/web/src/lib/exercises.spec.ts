import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createExercise,
  deactivateExercise,
  duplicateExercise,
  listExercises,
  updateExercise
} from './exercises';

afterEach(() => vi.restoreAllMocks());

describe('exercise library api client', () => {
  it('calls list and mutation endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await listExercises({ search: 'snatch', category: 'SNATCH' });
    await createExercise({ name: 'Custom Snatch', category: 'SNATCH', prescriptionType: 'LOAD', prBase: 'SNATCH', canUpdatePersonalRecord: false });
    await updateExercise('exercise-1', { name: 'Custom Snatch 2', category: 'SNATCH', prescriptionType: 'LOAD', prBase: 'SNATCH', canUpdatePersonalRecord: false });
    await deactivateExercise('exercise-1');
    await duplicateExercise('exercise-system');

    expect(fetchMock.mock.calls[0]![0]).toContain('/exercises?search=snatch&category=SNATCH');
    expect(fetchMock.mock.calls[1]![1]!.method).toBe('POST');
    expect(fetchMock.mock.calls[2]![1]!.method).toBe('PATCH');
    expect(fetchMock.mock.calls[3]![0]).toContain('/deactivate');
    expect(fetchMock.mock.calls[4]![0]).toContain('/duplicate');
  });
});
