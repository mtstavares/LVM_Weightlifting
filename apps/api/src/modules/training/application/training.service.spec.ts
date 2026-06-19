import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TrainingService } from './training.service';

const today = new Date();
const dateKey = today.toISOString().slice(0, 10);
const monthKey = dateKey.slice(0, 7);

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'day-1',
    trainingWeekId: 'week-1',
    weekday: 5,
    scheduledDate: new Date(`${dateKey}T00:00:00.000Z`),
    title: 'Treino',
    notes: null,
    deletedAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    blocks: [
      {
        id: 'section-1',
        trainingDayId: 'day-1',
        title: 'Aquecimento',
        type: 'STANDARD',
        sectionType: 'WARMUP',
        notes: null,
        displayOrder: 0,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sets: [
          {
            id: 'set-1',
            exerciseName: 'Mobilidade',
            sets: 2,
            reps: 10,
            prescribedWeight: null,
            restSeconds: 30,
            displayOrder: 0
          }
        ]
      }
    ],
    workoutCompletions: [],
    feedbacks: [],
    revisions: [],
    ...overrides
  };
}

describe('TrainingService', () => {
  let prisma: any;
  let audit: { record: jest.Mock };
  let service: TrainingService;
  const athlete = {
    id: 'athlete-1',
    userId: 'athlete-user',
    coachId: 'trainer-1',
    user: { id: 'athlete-user', fullName: 'Atleta Teste', email: 'athlete@lvm.local' }
  };

  beforeEach(() => {
    prisma = {
      athlete: { findUnique: jest.fn() },
      trainingDay: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      trainingWeek: { findFirst: jest.fn(), create: jest.fn() },
      trainingRevision: { create: jest.fn() },
      complexMovement: { deleteMany: jest.fn() },
      trainingSet: { deleteMany: jest.fn() },
      trainingBlock: { deleteMany: jest.fn(), update: jest.fn() },
      workoutCompletion: { upsert: jest.fn() },
      feedback: { upsert: jest.fn() },
      coachComment: { create: jest.fn() },
      $transaction: jest.fn(async (input: any) =>
        typeof input === 'function' ? input(prisma) : Promise.all(input)
      )
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new TrainingService(prisma, audit as any);
    prisma.athlete.findUnique.mockResolvedValue(athlete);
  });

  it('lists calendar entries with calculated status and progress', async () => {
    prisma.trainingDay.findMany.mockResolvedValue([
      fixture({ blocks: [{ ...fixture().blocks[0], completedAt: new Date() }] })
    ]);

    const result = await service.trainerCalendar('trainer-1', 'athlete-1', monthKey, {});

    expect(result.days[0]).toMatchObject({ id: 'day-1', progress: 100 });
    expect(prisma.trainingDay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) })
    );
  });

  it('blocks a trainer from another trainer athlete and audits denial', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ ...athlete, coachId: 'other' });

    await expect(
      service.trainerCalendar('trainer-1', 'athlete-1', monthKey, {})
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'ACCESS_DENIED' }));
  });

  it('creates a prescription with sections, revision and audit', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(null);
    prisma.trainingWeek.findFirst.mockResolvedValue(null);
    prisma.trainingWeek.create.mockResolvedValue({ id: 'week-1' });
    prisma.trainingDay.create.mockResolvedValue(fixture({ blocks: [] }));
    prisma.trainingDay.update.mockResolvedValue(fixture());
    prisma.trainingRevision.create.mockResolvedValue({});

    const result = await service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      {
        title: 'Treino',
        sections: [{
          type: 'WARMUP',
          exercises: [{ name: 'Mobilidade', sets: 2, reps: 10, restSeconds: 30 }]
        }]
      },
      {}
    );

    expect(result?.sections[0].exercises[0].name).toBe('Mobilidade');
    expect(prisma.trainingRevision.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'TRAINING_CREATED' }));
  });

  it('updates an existing prescription preserving a previous revision', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture());
    prisma.trainingWeek.findFirst.mockResolvedValue({ id: 'week-1' });
    prisma.trainingDay.update.mockResolvedValue(fixture({ version: 2 }));
    prisma.trainingRevision.create.mockResolvedValue({});

    await service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'STRENGTH', exercises: [{ name: 'Agachamento', sets: 5, reps: 3, load: 100 }] }] },
      {}
    );

    expect(prisma.trainingSet.deleteMany).toHaveBeenCalled();
    expect(prisma.trainingBlock.deleteMany).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'TRAINING_UPDATED' }));
  });

  it('logically deletes an unfinished workout and preserves snapshot', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture());
    prisma.trainingRevision.create.mockResolvedValue({});
    prisma.trainingDay.update.mockResolvedValue({});

    await service.deleteDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      {}
    );

    expect(prisma.trainingDay.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'TRAINING_DELETED' }));
  });

  it('starts, updates a section and completes the athlete workout', async () => {
    const started = fixture({ workoutCompletions: [] });
    prisma.trainingDay.findFirst
      .mockResolvedValueOnce(started)
      .mockResolvedValueOnce(started)
      .mockResolvedValueOnce(fixture({
        blocks: [{ ...fixture().blocks[0], completedAt: new Date() }],
        workoutCompletions: [{ startedAt: new Date(Date.now() - 60_000), completed: false }]
      }));
    prisma.workoutCompletion.upsert.mockResolvedValue({ startedAt: new Date() });
    prisma.trainingBlock.update.mockResolvedValue({});
    prisma.trainingDay.findUnique.mockResolvedValue(fixture());

    await service.startDay('athlete-user', 'day-1', {});
    await service.updateSection('athlete-user', 'day-1', 'section-1', true);
    await service.completeDay('athlete-user', 'day-1', {});

    expect(prisma.trainingBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { completedAt: expect.any(Date) } })
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'TRAINING_COMPLETED' }));
  });

  it('requires all populated sections before completion', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(
      fixture({ workoutCompletions: [{ startedAt: new Date(), completed: false }] })
    );

    await expect(service.completeDay('athlete-user', 'day-1', {}))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores feedback only after completion', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(
      fixture({ workoutCompletions: [{ startedAt: new Date(), completed: true, finishedAt: new Date() }] })
    );
    prisma.feedback.upsert.mockResolvedValue({ id: 'feedback-1' });

    await service.saveFeedback(
      'athlete-user',
      'day-1',
      { pse: 8, fatigue: 6, observations: 'Boa sessão' },
      {}
    );

    expect(prisma.feedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ rpe: 8, fatigue: 6 }) })
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEEDBACK_CREATED' }));
  });

  it('allows the owning trainer to comment athlete feedback', async () => {
    prisma.trainingDay.findUnique.mockResolvedValue({
      ...fixture(),
      trainingWeek: { athlete },
      feedbacks: [{ id: 'feedback-1' }]
    });
    prisma.coachComment.create.mockResolvedValue({ id: 'comment-1' });

    await service.addCoachComment(
      { id: 'trainer-1', fullName: 'Treinador' },
      'day-1',
      'Boa evolução.',
      {}
    );

    expect(prisma.coachComment.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'COACH_COMMENT_ADDED' }));
  });

  it('returns the athlete own detailed session with feedback and history', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      workoutCompletions: [{ completed: true, startedAt: new Date(), finishedAt: new Date() }],
      feedbacks: [{
        id: 'feedback-1',
        rpe: 7,
        fatigue: 4,
        comment: 'Tudo certo',
        createdAt: new Date(),
        updatedAt: new Date(),
        coachComments: [{
          id: 'comment-1',
          comment: 'Bom trabalho',
          createdAt: new Date(),
          coach: { id: 'trainer-1', fullName: 'Treinador' }
        }]
      }],
      revisions: [{
        id: 'revision-1',
        version: 1,
        action: 'CREATED',
        createdAt: new Date(),
        changedBy: { id: 'trainer-1', fullName: 'Treinador', role: 'TRAINER' }
      }]
    }));

    const result = await service.athleteDay('athlete-user', dateKey);

    expect(result).toMatchObject({
      status: 'COMPLETED',
      feedback: { pse: 7, fatigue: 4 },
      history: [{ version: 1 }]
    });
  });

  it('rejects duplicate sections and edits after completion', async () => {
    await expect(service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'WARMUP', exercises: [] }, { type: 'WARMUP', exercises: [] }] },
      {}
    )).rejects.toBeInstanceOf(BadRequestException);

    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      workoutCompletions: [{ completed: true }]
    }));
    await expect(service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [] },
      {}
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects deleting a completed workout', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      workoutCompletions: [{ completed: true }]
    }));

    await expect(service.deleteDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      {}
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects future starts and invalid section changes', async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 1);
    prisma.trainingDay.findFirst.mockResolvedValueOnce(fixture({ scheduledDate: future }));
    await expect(service.startDay('athlete-user', 'day-1', {}))
      .rejects.toBeInstanceOf(BadRequestException);

    prisma.trainingDay.findFirst.mockResolvedValueOnce(fixture());
    await expect(service.updateSection('athlete-user', 'day-1', 'missing', true))
      .rejects.toThrow('Training section not found.');

    prisma.trainingDay.findFirst.mockResolvedValueOnce(fixture({
      blocks: [{ ...fixture().blocks[0], sets: [] }]
    }));
    await expect(service.updateSection('athlete-user', 'day-1', 'section-1', true))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects feedback before completion and comments without feedback', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture());
    await expect(service.saveFeedback(
      'athlete-user',
      'day-1',
      { pse: 5, fatigue: 5 },
      {}
    )).rejects.toBeInstanceOf(BadRequestException);

    prisma.trainingDay.findUnique.mockResolvedValue({
      ...fixture(),
      trainingWeek: { athlete },
      feedbacks: []
    });
    await expect(service.addCoachComment(
      { id: 'trainer-1', fullName: 'Treinador' },
      'day-1',
      'Comentário',
      {}
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates calendar month boundaries and missing days', async () => {
    await expect(service.athleteCalendar('athlete-user', 'invalid'))
      .rejects.toBeInstanceOf(BadRequestException);
    prisma.trainingDay.findFirst.mockResolvedValue(null);
    await expect(service.athleteDay('athlete-user', dateKey)).resolves.toBeNull();
  });
});
