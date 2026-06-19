import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addTrainingComment,
  athleteCalendar,
  completeTraining,
  deleteTrainerTrainingDay,
  getAthleteTrainingDay,
  getTrainerTrainingDay,
  saveTrainerTrainingDay,
  saveTrainingFeedback,
  startTraining,
  trainerCalendar,
  updateTrainingSection
} from './training';

afterEach(() => vi.restoreAllMocks());

describe('training api client', () => {
  it('calls trainer calendar, prescription and comment endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await trainerCalendar('athlete-1', '2026-06');
    await getTrainerTrainingDay('athlete-1', '2026-06-19');
    await saveTrainerTrainingDay('athlete-1', '2026-06-19', {
      title: 'Treino',
      sections: [{ type: 'WARMUP', exercises: [] }]
    });
    await deleteTrainerTrainingDay('athlete-1', '2026-06-19');
    await addTrainingComment('day-1', 'Boa execução.');

    expect(fetchMock.mock.calls[0][0]).toContain('athlete-1/calendar?month=2026-06');
    expect(fetchMock.mock.calls[2][1]?.method).toBe('PUT');
    expect(fetchMock.mock.calls[3][1]?.method).toBe('DELETE');
    expect(fetchMock.mock.calls[4][0]).toContain('/comments');
  });

  it('calls athlete calendar, execution and feedback endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await athleteCalendar('2026-06');
    await getAthleteTrainingDay('2026-06-19');
    await startTraining('day-1');
    await updateTrainingSection('day-1', 'section-1', true);
    await completeTraining('day-1');
    await saveTrainingFeedback('day-1', { pse: 8, fatigue: 6, observations: 'Boa sessão' });

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls[2][0]).toContain('/start');
    expect(fetchMock.mock.calls[3][1]?.method).toBe('PATCH');
    expect(fetchMock.mock.calls[4][0]).toContain('/complete');
    expect(fetchMock.mock.calls[5][0]).toContain('/feedback');
  });
});
