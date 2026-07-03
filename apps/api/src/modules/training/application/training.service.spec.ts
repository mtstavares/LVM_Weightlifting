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
            exerciseKey: null,
            exerciseName: 'Mobilidade',
            sets: 2,
            reps: 10,
            percentage: null,
            percentageEnd: null,
            prescribedWeight: null,
            targetPrExercise: null,
            calculatedWeightSnapshot: null,
            calculatedWeightEndSnapshot: null,
            durationMinutes: null,
            notes: null,
            prUpdateEligible: false,
            prCandidateDeclinedWeight: null,
            restSeconds: 30,
            attempts: [],
            displayOrder: 0
          }
        ]
      }
    ],
    workoutCompletions: [],
    feedbacks: [],
    trainingMessages: [],
    trainingWeek: { athlete: { personalRecords: [], user: { id: 'athlete-user', fullName: 'Atleta Teste' } } },
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
    ,
    personalRecords: []
  };

  beforeEach(() => {
    prisma = {
      athlete: { findUnique: jest.fn() },
      exercise: { findFirst: jest.fn() },
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
      trainingSet: { deleteMany: jest.fn(), updateMany: jest.fn() },
      trainingSetAttempt: { upsert: jest.fn() },
      trainingBlock: { deleteMany: jest.fn(), update: jest.fn() },
      workoutCompletion: { upsert: jest.fn() },
      feedback: { create: jest.fn(), upsert: jest.fn() },
      personalRecord: { upsert: jest.fn() },
      personalRecordHistory: { create: jest.fn() },
      coachComment: { create: jest.fn() },
      trainingMessage: { create: jest.fn() },
      $transaction: jest.fn(async (input: any) =>
        typeof input === 'function' ? input(prisma) : Promise.all(input)
      )
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new TrainingService(prisma, audit as any);
    prisma.athlete.findUnique.mockResolvedValue(athlete);
    prisma.exercise.findFirst.mockImplementation(({ where }: any) => {
      const key = where.key;
      const configs: Record<string, any> = {
        SNATCH: { key: 'SNATCH', name: 'Snatch', category: 'SNATCH', prescriptionType: 'LOAD', prBase: 'SNATCH', canUpdatePersonalRecord: true },
        HANG_SNATCH: { key: 'HANG_SNATCH', name: 'Hang Snatch', category: 'SNATCH', prescriptionType: 'LOAD', prBase: 'SNATCH', canUpdatePersonalRecord: false },
        POWER_SNATCH: { key: 'POWER_SNATCH', name: 'Power Snatch', category: 'SNATCH', prescriptionType: 'LOAD', prBase: 'SNATCH', canUpdatePersonalRecord: false },
        SNATCH_BALANCE: { key: 'SNATCH_BALANCE', name: 'Snatch Balance', category: 'SNATCH', prescriptionType: 'LOAD', prBase: 'SNATCH', canUpdatePersonalRecord: false },
        CLEAN_PULL: { key: 'CLEAN_PULL', name: 'Clean Pull', category: 'CLEAN_AND_JERK', prescriptionType: 'LOAD', prBase: 'CLEAN_JERK', canUpdatePersonalRecord: false },
        SPLIT_JERK: { key: 'SPLIT_JERK', name: 'Split Jerk', category: 'CLEAN_AND_JERK', prescriptionType: 'LOAD', prBase: 'CLEAN_JERK', canUpdatePersonalRecord: false },
        BACK_SQUAT: { key: 'BACK_SQUAT', name: 'Back Squat', category: 'SQUAT', prescriptionType: 'LOAD', prBase: 'BACK_SQUAT', canUpdatePersonalRecord: true },
        PAUSE_BACK_SQUAT: { key: 'PAUSE_BACK_SQUAT', name: 'Pause Back Squat', category: 'SQUAT', prescriptionType: 'LOAD', prBase: 'BACK_SQUAT', canUpdatePersonalRecord: false },
        FRONT_SQUAT: { key: 'FRONT_SQUAT', name: 'Front Squat', category: 'SQUAT', prescriptionType: 'LOAD', prBase: 'FRONT_SQUAT', canUpdatePersonalRecord: true },
        PAUSE_FRONT_SQUAT: { key: 'PAUSE_FRONT_SQUAT', name: 'Pause Front Squat', category: 'SQUAT', prescriptionType: 'LOAD', prBase: 'FRONT_SQUAT', canUpdatePersonalRecord: false },
        DEADLIFT: { key: 'DEADLIFT', name: 'Deadlift', category: 'DEADLIFT', prescriptionType: 'LOAD', prBase: 'DEADLIFT', canUpdatePersonalRecord: true },
        RDL: { key: 'RDL', name: 'RDL', category: 'DEADLIFT', prescriptionType: 'LOAD', prBase: 'DEADLIFT', canUpdatePersonalRecord: false },
        MOBILITY: { key: 'MOBILITY', name: 'Mobilidade', category: 'MOBILITY', prescriptionType: 'TIME', prBase: null, canUpdatePersonalRecord: false },
        GENERAL_WARMUP: { key: 'GENERAL_WARMUP', name: 'Aquecimento Geral', category: 'GENERAL_WARMUP', prescriptionType: 'TIME', prBase: null, canUpdatePersonalRecord: false },
        CORE: { key: 'CORE', name: 'Core', category: 'ACCESSORY', prescriptionType: 'TEXT', prBase: null, canUpdatePersonalRecord: false }
      };
      return Promise.resolve(configs[key] ?? null);
    });
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
          exercises: [{ name: 'Mobilidade', sets: 2, reps: 10, load: 20 }]
        }]
      },
      {}
    );

    expect(result!.sections[0].exercises[0].name).toBe('Mobilidade');
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

  it('calculates percentage prescriptions from the matching PR and keeps snapshot', async () => {
    prisma.athlete.findUnique.mockResolvedValue({
      ...athlete,
      personalRecords: [{ exercise: 'BACK_SQUAT', weight: 200 }]
    });
    prisma.trainingDay.findFirst.mockResolvedValue(null);
    prisma.trainingWeek.findFirst.mockResolvedValue({ id: 'week-1' });
    prisma.trainingDay.create.mockResolvedValue(fixture({ blocks: [] }));
    prisma.trainingDay.update.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseName: 'Back Squat',
          sets: 1,
          percentage: 85,
          prescribedWeight: 170,
          calculatedWeightSnapshot: 170,
          exerciseKey: 'BACK_SQUAT',
          prUpdateEligible: true,
          targetPrExercise: 'BACK_SQUAT'
        }]
      }]
    }));

    const result = await service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'STRENGTH', exercises: [{ exerciseKey: 'BACK_SQUAT', name: 'Back Squat', sets: 5, reps: 3, mode: 'PERCENTAGE', percentage: 85 }] }] },
      {}
    );

    expect(prisma.trainingDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blocks: expect.objectContaining({
            create: [expect.objectContaining({
              sets: expect.objectContaining({
                create: [expect.objectContaining({
                  percentage: 85,
                  prescribedWeight: 170,
                  calculatedWeightSnapshot: 170,
                  exerciseKey: 'BACK_SQUAT',
                  prUpdateEligible: true,
                  targetPrExercise: 'BACK_SQUAT'
                })]
              })
            })]
          })
        })
      })
    );
    expect(result!.sections[0].exercises[0]).toMatchObject({ percentage: 85, calculatedWeight: 170 });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'TRAINING_PERCENTAGE_CALCULATED' }));
  });

  it('calculates percentage range prescriptions and stores both snapshots', async () => {
    prisma.athlete.findUnique.mockResolvedValue({
      ...athlete,
      personalRecords: [{ exercise: 'FRONT_SQUAT', weight: 100 }]
    });
    prisma.trainingDay.findFirst.mockResolvedValue(null);
    prisma.trainingWeek.findFirst.mockResolvedValue({ id: 'week-1' });
    prisma.trainingDay.create.mockResolvedValue(fixture({ blocks: [] }));
    prisma.trainingDay.update.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseName: 'Front Squat',
          sets: 4,
          reps: 3,
          percentage: 60,
          percentageEnd: 75,
          prescribedWeight: 60,
          calculatedWeightSnapshot: 60,
          calculatedWeightEndSnapshot: 75,
          exerciseKey: 'FRONT_SQUAT',
          targetPrExercise: 'FRONT_SQUAT'
        }]
      }]
    }));

    const result = await service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'STRENGTH', exercises: [{ exerciseKey: 'FRONT_SQUAT', name: 'Front Squat', sets: 4, reps: 3, mode: 'PERCENTAGE_RANGE', percentage: 60, percentageEnd: 75 }] }] },
      {}
    );

    expect(prisma.trainingDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blocks: expect.objectContaining({
            create: [expect.objectContaining({
              sets: expect.objectContaining({
                create: [expect.objectContaining({
                  percentage: 60,
                  percentageEnd: 75,
                  prescribedWeight: 60,
                  calculatedWeightSnapshot: 60,
                  calculatedWeightEndSnapshot: 75
                })]
              })
            })]
          })
        })
      })
    );
    expect(result!.sections[0].exercises[0]).toMatchObject({ percentage: 60, percentageEnd: 75, calculatedWeight: 60, calculatedWeightEnd: 75 });
  });

  it('stores mobility and general warm-up as time prescriptions', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(null);
    prisma.trainingWeek.findFirst.mockResolvedValue({ id: 'week-1' });
    prisma.trainingDay.create.mockResolvedValue(fixture({ blocks: [] }));
    prisma.trainingDay.update.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'GENERAL_WARMUP',
          exerciseName: 'Aquecimento Geral',
          sets: 1,
          reps: 1,
          durationMinutes: 15
        }]
      }]
    }));

    const result = await service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'WARMUP', exercises: [{ exerciseKey: 'GENERAL_WARMUP', name: 'Aquecimento Geral', sets: 1, reps: 1, mode: 'TIME', durationMinutes: 15 }] }] },
      {}
    );

    expect(prisma.trainingDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blocks: expect.objectContaining({
            create: [expect.objectContaining({
              sets: expect.objectContaining({
                create: [expect.objectContaining({
                  exerciseKey: 'GENERAL_WARMUP',
                  exerciseName: 'Aquecimento Geral',
                  sets: 1,
                  reps: 1,
                  durationMinutes: 15,
                  prescribedWeight: null,
                  percentage: null
                })]
              })
            })]
          })
        })
      })
    );
    expect(result!.sections[0].exercises[0]).toMatchObject({ durationMinutes: 15, load: null, percentage: null });
  });

  it('stores Core and General Accessory as text prescriptions', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(null);
    prisma.trainingWeek.findFirst.mockResolvedValue({ id: 'week-1' });
    prisma.trainingDay.create.mockResolvedValue(fixture({ blocks: [] }));
    prisma.trainingDay.update.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'CORE',
          exerciseName: 'Core',
          sets: 1,
          reps: 1,
          notes: '3 rounds: prancha 45s.'
        }]
      }]
    }));

    const result = await service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'BODYBUILDING', exercises: [{ exerciseKey: 'CORE', name: 'Core', sets: 1, reps: 1, mode: 'TEXT', notes: '3 rounds: prancha 45s.' }] }] },
      {}
    );

    expect(prisma.trainingDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blocks: expect.objectContaining({
            create: [expect.objectContaining({
              sets: expect.objectContaining({
                create: [expect.objectContaining({
                  exerciseKey: 'CORE',
                  exerciseName: 'Core',
                  sets: 1,
                  reps: 1,
                  notes: '3 rounds: prancha 45s.',
                  prescribedWeight: null,
                  percentage: null
                })]
              })
            })]
          })
        })
      })
    );
    expect(result!.sections[0].exercises[0]).toMatchObject({ notes: '3 rounds: prancha 45s.', load: null, percentage: null });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'TRAINING_CORE_PRESCRIPTION_CREATED' }));
  });

  it.each([
    ['HANG_SNATCH', 'Hang Snatch', 'SNATCH', 100, 80, 80],
    ['POWER_SNATCH', 'Power Snatch', 'SNATCH', 100, 75, 75],
    ['SNATCH_BALANCE', 'Snatch Balance', 'SNATCH', 100, 60, 60],
    ['CLEAN_PULL', 'Clean Pull', 'CLEAN_JERK', 150, 90, 135],
    ['SPLIT_JERK', 'Split Jerk', 'CLEAN_JERK', 150, 80, 120],
    ['PAUSE_BACK_SQUAT', 'Pause Back Squat', 'BACK_SQUAT', 200, 85, 170],
    ['PAUSE_FRONT_SQUAT', 'Pause Front Squat', 'FRONT_SQUAT', 160, 75, 120],
    ['RDL', 'RDL', 'DEADLIFT', 220, 70, 154]
  ])('uses configured PR base for %s percentage prescription', async (exerciseKey, name, prBase, prWeight, percentage, expectedWeight) => {
    prisma.athlete.findUnique.mockResolvedValue({
      ...athlete,
      personalRecords: [{ exercise: prBase, weight: prWeight }]
    });
    prisma.trainingDay.findFirst.mockResolvedValue(null);
    prisma.trainingWeek.findFirst.mockResolvedValue({ id: 'week-1' });
    prisma.trainingDay.create.mockResolvedValue(fixture({ blocks: [] }));
    prisma.trainingDay.update.mockResolvedValue(fixture());

    await service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'STRENGTH', exercises: [{ exerciseKey, name, sets: 4, reps: 2, mode: 'PERCENTAGE', percentage }] }] },
      {}
    );

    expect(prisma.trainingDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blocks: expect.objectContaining({
            create: [expect.objectContaining({
              sets: expect.objectContaining({
                create: [expect.objectContaining({
                  exerciseKey,
                  exerciseName: name,
                  percentage,
                  prescribedWeight: expectedWeight,
                  calculatedWeightSnapshot: expectedWeight,
                  targetPrExercise: prBase,
                  prUpdateEligible: false
                })]
              })
            })]
          })
        })
      })
    );
  });

  it('rejects percentage prescription without a mapped or registered PR', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(null);
    await expect(service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'STRENGTH', exercises: [{ name: 'Good Morning', sets: 3, reps: 5, mode: 'PERCENTAGE', percentage: 80 }] }] },
      {}
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'TRAINING_PERCENTAGE_WITHOUT_PR', result: 'FAILURE' }));

    await expect(service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'STRENGTH', exercises: [{ exerciseKey: 'DEADLIFT', name: 'Deadlift', sets: 3, reps: 5, mode: 'PERCENTAGE', percentage: 80 }] }] },
      {}
    )).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.saveDay(
      { id: 'trainer-1', fullName: 'Treinador' },
      'athlete-1',
      dateKey,
      { sections: [{ type: 'WARMUP', exercises: [{ exerciseKey: 'MOBILITY', name: 'Mobilidade', sets: 2, reps: 10, mode: 'PERCENTAGE', percentage: 50 }] }] },
      {}
    )).rejects.toBeInstanceOf(BadRequestException);
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

  it('starts, updates a section with answered sets and completes the athlete workout', async () => {
    const started = fixture({ workoutCompletions: [] });
    const answered = fixture({
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          sets: 1,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      workoutCompletions: [{ startedAt: new Date(Date.now() - 60_000), completed: false }]
    });
    prisma.trainingDay.findFirst
      .mockResolvedValueOnce(started)
      .mockResolvedValueOnce(answered)
      .mockResolvedValueOnce(fixture({
        blocks: [{
          ...fixture().blocks[0],
          completedAt: new Date(),
          sets: [{
            ...fixture().blocks[0].sets[0],
            sets: 1,
            attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
          }]
        }],
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

  it('rejects completing a section before all sets are answered', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      workoutCompletions: [{ startedAt: new Date(), completed: false }],
      blocks: [{
        ...fixture().blocks[0],
        sets: [{ ...fixture().blocks[0].sets[0], sets: 2, attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }] }]
      }]
    }));

    await expect(
      service.updateSection('athlete-user', 'day-1', 'section-1', true)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks individual set attempts before workout completion', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      workoutCompletions: [{ startedAt: new Date(), completed: false }],
      blocks: [{
        ...fixture().blocks[0],
        sets: [{ ...fixture().blocks[0].sets[0], sets: 3 }]
      }]
    }));
    prisma.trainingSetAttempt.upsert.mockResolvedValue({});
    prisma.trainingDay.findUnique.mockResolvedValue(fixture({
      workoutCompletions: [{ startedAt: new Date(), completed: false }],
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          sets: 3,
          attempts: [{ setIndex: 2, successful: false, completedAt: new Date() }]
        }]
      }]
    }));

    const result = await service.updateSetAttempt('athlete-user', 'day-1', 'set-1', 2, false);

    expect(prisma.trainingSetAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trainingSetId_setIndex: { trainingSetId: 'set-1', setIndex: 2 } },
        create: { trainingSetId: 'set-1', setIndex: 2, successful: false }
      })
    );
    expect(prisma.trainingBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { completedAt: null } })
    );
    expect(result!.sections[0].exercises[0].attempts[1]).toMatchObject({ setIndex: 2, successful: false });
  });

  it('automatically completes a section after all sets are answered', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      workoutCompletions: [{ startedAt: new Date(), completed: false }],
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          sets: 2,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }]
    }));
    prisma.trainingSetAttempt.upsert.mockResolvedValue({});
    prisma.trainingDay.findUnique.mockResolvedValue(fixture({
      workoutCompletions: [{ startedAt: new Date(), completed: false }],
      blocks: [{
        ...fixture().blocks[0],
        completedAt: new Date(),
        sets: [{
          ...fixture().blocks[0].sets[0],
          sets: 2,
          attempts: [
            { setIndex: 1, successful: true, completedAt: new Date() },
            { setIndex: 2, successful: false, completedAt: new Date() }
          ]
        }]
      }]
    }));

    await service.updateSetAttempt('athlete-user', 'day-1', 'set-1', 2, false);

    expect(prisma.trainingBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { completedAt: expect.any(Date) } })
    );
  });

  it('identifies possible personal records after completion without updating PRs', async () => {
    prisma.athlete.findUnique.mockResolvedValue({
      ...athlete,
      personalRecords: [{ exercise: 'SNATCH', weight: 100 }]
    });
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        completedAt: new Date(),
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'SNATCH',
          exerciseName: 'Snatch',
          sets: 1,
          prescribedWeight: 105,
          targetPrExercise: 'SNATCH',
          prUpdateEligible: true,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: 'SNATCH', weight: 100 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(Date.now() - 60_000), completed: false }]
    }));
    prisma.workoutCompletion.upsert.mockResolvedValue({});
    prisma.trainingDay.findUnique.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'SNATCH',
          exerciseName: 'Snatch',
          sets: 1,
          prescribedWeight: 105,
          targetPrExercise: 'SNATCH',
          prUpdateEligible: true,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: 'SNATCH', weight: 100 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(), completed: true, finishedAt: new Date() }]
    }));

    const result = await service.completeDay('athlete-user', 'day-1', {});

    expect(result!.possiblePersonalRecords).toEqual([
      expect.objectContaining({ movement: 'SNATCH', candidateWeight: 105, currentPr: 100 })
    ]);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'PERSONAL_RECORD_CANDIDATE_IDENTIFIED' }));
  });

  it('does not expose possible personal records before workout completion', async () => {
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        completedAt: new Date(),
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'SNATCH',
          exerciseName: 'Snatch',
          sets: 1,
          prescribedWeight: 105,
          targetPrExercise: 'SNATCH',
          prUpdateEligible: true,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: 'SNATCH', weight: 100 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(), completed: false }]
    }));

    const result = await service.athleteDay('athlete-user', dateKey);

    expect(result!.possiblePersonalRecords).toEqual([]);
  });

  it('confirms a post-workout personal record candidate automatically', async () => {
    prisma.athlete.findUnique.mockResolvedValue({
      ...athlete,
      personalRecords: [{ exercise: 'SNATCH', weight: 100 }]
    });
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        completedAt: new Date(),
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'SNATCH',
          exerciseName: 'Snatch',
          sets: 1,
          prescribedWeight: 105,
          targetPrExercise: 'SNATCH',
          prUpdateEligible: true,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: 'SNATCH', weight: 100 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(), completed: true, finishedAt: new Date() }]
    }));
    prisma.personalRecord.upsert.mockResolvedValue({ id: 'record-1' });
    prisma.trainingDay.findUnique.mockResolvedValue(fixture({
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: 'SNATCH', weight: 105 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(), completed: true, finishedAt: new Date() }]
    }));

    const result = await service.confirmPersonalRecord('athlete-user', 'day-1', 'SNATCH', {});

    expect(prisma.personalRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { athleteId_exercise: { athleteId: 'athlete-1', exercise: 'SNATCH' } },
        update: expect.objectContaining({ weight: 105 })
      })
    );
    expect(prisma.personalRecordHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ exercise: 'SNATCH', weight: 105 }) })
    );
    expect(result!.possiblePersonalRecords).toEqual([]);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'PERSONAL_RECORD_UPDATE_CONFIRMED' }));
  });

  it('declines a personal record candidate and hides the same suggestion', async () => {
    const completedDay = fixture({
      blocks: [{
        ...fixture().blocks[0],
        completedAt: new Date(),
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'SNATCH',
          exerciseName: 'Snatch',
          sets: 1,
          prescribedWeight: 105,
          targetPrExercise: 'SNATCH',
          prUpdateEligible: true,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: 'SNATCH', weight: 100 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(), completed: true, finishedAt: new Date() }]
    });
    prisma.trainingDay.findFirst.mockResolvedValue(completedDay);
    prisma.trainingDay.findUnique.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        completedAt: new Date(),
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'SNATCH',
          exerciseName: 'Snatch',
          sets: 1,
          prescribedWeight: 105,
          targetPrExercise: 'SNATCH',
          prUpdateEligible: true,
          prCandidateDeclinedWeight: 105,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: completedDay.trainingWeek,
      workoutCompletions: completedDay.workoutCompletions
    }));

    const result = await service.declinePersonalRecord('athlete-user', 'day-1', 'SNATCH', {});

    expect(prisma.trainingSet.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { prCandidateDeclinedWeight: 105 }
      })
    );
    expect(result!.possiblePersonalRecords).toEqual([]);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'PERSONAL_RECORD_UPDATE_DECLINED' }));
  });

  it.each([
    ['HANG_SNATCH', 'Hang Snatch', 'SNATCH'],
    ['CLEAN_PULL', 'Clean Pull', 'CLEAN_JERK']
  ])('does not suggest PR update for derived exercise %s', async (exerciseKey, exerciseName, targetPrExercise) => {
    prisma.athlete.findUnique.mockResolvedValue({
      ...athlete,
      personalRecords: [{ exercise: targetPrExercise, weight: 100 }]
    });
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        completedAt: new Date(),
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey,
          exerciseName,
          sets: 1,
          prescribedWeight: 120,
          targetPrExercise,
          prUpdateEligible: false,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: targetPrExercise, weight: 100 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(Date.now() - 60_000), completed: false }]
    }));
    prisma.workoutCompletion.upsert.mockResolvedValue({});
    prisma.trainingDay.findUnique.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey,
          exerciseName,
          sets: 1,
          prescribedWeight: 120,
          targetPrExercise,
          prUpdateEligible: false,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: targetPrExercise, weight: 100 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      }
    }));

    const result = await service.completeDay('athlete-user', 'day-1', {});

    expect(result!.possiblePersonalRecords).toEqual([]);
    expect(audit.record).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'PERSONAL_RECORD_CANDIDATE_IDENTIFIED' }));
  });

  it('suggests PR update for Clean & Jerk when eligible', async () => {
    prisma.athlete.findUnique.mockResolvedValue({
      ...athlete,
      personalRecords: [{ exercise: 'CLEAN_JERK', weight: 150 }]
    });
    prisma.trainingDay.findFirst.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        completedAt: new Date(),
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'CLEAN_JERK',
          exerciseName: 'Clean & Jerk',
          sets: 1,
          prescribedWeight: 155,
          targetPrExercise: 'CLEAN_JERK',
          prUpdateEligible: true,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: 'CLEAN_JERK', weight: 150 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(Date.now() - 60_000), completed: false }]
    }));
    prisma.workoutCompletion.upsert.mockResolvedValue({});
    prisma.trainingDay.findUnique.mockResolvedValue(fixture({
      blocks: [{
        ...fixture().blocks[0],
        sets: [{
          ...fixture().blocks[0].sets[0],
          exerciseKey: 'CLEAN_JERK',
          exerciseName: 'Clean & Jerk',
          sets: 1,
          prescribedWeight: 155,
          targetPrExercise: 'CLEAN_JERK',
          prUpdateEligible: true,
          attempts: [{ setIndex: 1, successful: true, completedAt: new Date() }]
        }]
      }],
      trainingWeek: {
        athlete: {
          personalRecords: [{ exercise: 'CLEAN_JERK', weight: 150 }],
          user: { id: 'athlete-user', fullName: 'Atleta Teste' }
        }
      },
      workoutCompletions: [{ startedAt: new Date(), completed: true, finishedAt: new Date() }]
    }));

    const result = await service.completeDay('athlete-user', 'day-1', {});

    expect(result!.possiblePersonalRecords).toEqual([
      expect.objectContaining({ movement: 'CLEAN_JERK', candidateWeight: 155, currentPr: 150 })
    ]);
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
    prisma.feedback.create.mockResolvedValue({ id: 'feedback-1' });
    prisma.trainingMessage.create.mockResolvedValue({ id: 'message-1' });

    await service.saveFeedback(
      'athlete-user',
      'day-1',
      { pse: 8, fatigue: 6, observations: 'Boa sessão' },
      {}
    );

    expect(prisma.feedback.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rpe: 8, fatigue: 6 }) })
    );
    expect(prisma.trainingMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ message: 'Boa sessão' }) })
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEEDBACK_CREATED' }));
  });

  it('allows the owning trainer to comment athlete feedback', async () => {
    prisma.trainingDay.findUnique.mockResolvedValue({
      ...fixture(),
      trainingWeek: { athlete },
      feedbacks: [{ id: 'feedback-1' }]
    });
    prisma.trainingMessage.create.mockResolvedValue({ id: 'message-1' });

    await service.addCoachComment(
      { id: 'trainer-1', fullName: 'Treinador' },
      'day-1',
      'Boa evolução.',
      {}
    );

    expect(prisma.trainingMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ message: 'Boa evolução.' }) })
    );
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
      }],
      trainingMessages: [{
        id: 'message-1',
        message: 'Tudo certo',
        createdAt: new Date(),
        sender: { id: 'athlete-user', fullName: 'Atleta Teste', role: 'ATHLETE' }
      }]
    }));

    const result = await service.athleteDay('athlete-user', dateKey);

    expect(result).toMatchObject({
      status: 'COMPLETED',
      feedback: { pse: 7, fatigue: 4 },
      messages: [{ message: 'Tudo certo' }],
      history: [{ version: 1 }]
    });
  });

  it('rejects feedback changes after first submission and allows athlete messages', async () => {
    prisma.trainingDay.findFirst
      .mockResolvedValueOnce(fixture({
        workoutCompletions: [{ startedAt: new Date(), completed: true, finishedAt: new Date() }],
        feedbacks: [{ id: 'feedback-1' }]
      }))
      .mockResolvedValueOnce(fixture({
        workoutCompletions: [{ startedAt: new Date(), completed: true, finishedAt: new Date() }],
        feedbacks: [{ id: 'feedback-1' }]
      }));
    prisma.trainingMessage.create.mockResolvedValue({ id: 'message-1' });

    await expect(service.saveFeedback(
      'athlete-user',
      'day-1',
      { pse: 9, fatigue: 9, observations: 'Mudança' },
      {}
    )).rejects.toBeInstanceOf(BadRequestException);

    await service.addAthleteMessage('athlete-user', 'day-1', 'Resposta do atleta.', {});
    expect(prisma.trainingMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ message: 'Resposta do atleta.' }) })
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'TRAINING_MESSAGE_SENT' }));
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
