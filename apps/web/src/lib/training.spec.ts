import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addTrainingComment,
  athleteCalendar,
  completeTraining,
  confirmTrainingPersonalRecord,
  declineTrainingPersonalRecord,
  deleteTrainerTrainingDay,
  getAthleteTrainingDay,
  getTrainerTrainingDay,
  saveTrainerTrainingDay,
  saveTrainingFeedback,
  sendAthleteTrainingMessage,
  startTraining,
  trainerCalendar,
  updateTrainingSetAttempt,
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

    expect(fetchMock.mock.calls[0]![0]).toContain('athlete-1/calendar?month=2026-06');
    expect(fetchMock.mock.calls[2]![1]!.method).toBe('PUT');
    expect(fetchMock.mock.calls[3]![1]!.method).toBe('DELETE');
    expect(fetchMock.mock.calls[4]![0]).toContain('/comments');
  });

  it('calls athlete calendar, execution, feedback and message endpoints', async () => {
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
    await updateTrainingSetAttempt('day-1', 'set-1', 2, false);
    await completeTraining('day-1');
    await confirmTrainingPersonalRecord('day-1', 'SNATCH');
    await declineTrainingPersonalRecord('day-1', 'SNATCH');
    await saveTrainingFeedback('day-1', { pse: 8, fatigue: 6, observations: 'Boa sessão' });
    await sendAthleteTrainingMessage('day-1', 'Resposta do atleta.');

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(fetchMock.mock.calls[2]![0]).toContain('/start');
    expect(fetchMock.mock.calls[3]![1]!.method).toBe('PATCH');
    expect(fetchMock.mock.calls[4]![0]).toContain('/sets/set-1/attempts/2');
    expect(fetchMock.mock.calls[5]![0]).toContain('/complete');
    expect(fetchMock.mock.calls[6]![0]).toContain('/personal-records/SNATCH/confirm');
    expect(fetchMock.mock.calls[7]![0]).toContain('/personal-records/SNATCH/decline');
    expect(fetchMock.mock.calls[8]![0]).toContain('/feedback');
    expect(fetchMock.mock.calls[9]![0]).toContain('/messages');
  });

  it('accepts empty successful responses without JSON errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('', { status: 200 })
    );

    await expect(getTrainerTrainingDay('athlete-1', '2026-06-19')).resolves.toBeUndefined();
  });
});
