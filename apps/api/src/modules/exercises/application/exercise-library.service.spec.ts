import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExerciseLibraryService } from './exercise-library.service';

describe('ExerciseLibraryService', () => {
  let prisma: any;
  let audit: { record: jest.Mock };
  let service: ExerciseLibraryService;

  const exercise = {
    id: 'exercise-1',
    key: 'CUSTOM_1',
    trainerId: 'trainer-1',
    name: 'Meu exercício',
    category: 'SNATCH',
    prescriptionType: 'LOAD',
    prBase: 'SNATCH',
    canUpdatePersonalRecord: false,
    isSystem: false,
    isActive: true,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    prisma = {
      exercise: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ExerciseLibraryService(prisma, audit as any);
  });

  it('lists system and trainer exercises', async () => {
    prisma.exercise.findMany.mockResolvedValue([exercise]);

    const result = await service.listForTrainer('trainer-1', {});

    expect(prisma.exercise.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ isSystem: true }, { trainerId: 'trainer-1' }] })
    }));
    expect(result[0]).toMatchObject({ id: 'exercise-1', origin: 'CUSTOM' });
  });

  it('creates trainer custom exercise', async () => {
    prisma.exercise.create.mockResolvedValue(exercise);

    const result = await service.create('trainer-1', {
      name: 'Meu exercício',
      category: 'SNATCH',
      prescriptionType: 'LOAD',
      prBase: 'SNATCH',
      canUpdatePersonalRecord: false
    }, {});

    expect(prisma.exercise.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ trainer: { connect: { id: 'trainer-1' } }, isSystem: false })
    }));
    expect(result.origin).toBe('CUSTOM');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'EXERCISE_CREATED' }));
  });

  it('rejects editing system exercise', async () => {
    prisma.exercise.findUnique.mockResolvedValue({ ...exercise, isSystem: true, trainerId: null });

    await expect(service.update('trainer-1', 'exercise-1', {
      name: 'Editado',
      category: 'SNATCH',
      prescriptionType: 'LOAD',
      prBase: 'SNATCH',
      canUpdatePersonalRecord: false
    }, {})).rejects.toBeInstanceOf(ForbiddenException);

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'EXERCISE_GLOBAL_EDIT_DENIED' }));
  });

  it('updates trainer custom exercise', async () => {
    prisma.exercise.findUnique.mockResolvedValue(exercise);
    prisma.exercise.update.mockResolvedValue({
      ...exercise,
      name: 'Editado',
      description: 'Instruções'
    });

    const result = await service.update('trainer-1', 'exercise-1', {
      name: ' Editado ',
      category: 'SQUAT',
      prescriptionType: 'TEXT',
      prBase: 'SNATCH',
      canUpdatePersonalRecord: true,
      description: ' Instruções '
    }, { ipAddress: '127.0.0.1', userAgent: 'jest' });

    expect(prisma.exercise.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Editado',
        prescriptionType: 'TEXT',
        canUpdatePersonalRecord: false,
        description: 'Instruções'
      })
    }));
    expect(result.name).toBe('Editado');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'EXERCISE_UPDATED' }));
  });

  it('deactivates trainer custom exercise', async () => {
    prisma.exercise.findUnique.mockResolvedValue(exercise);
    prisma.exercise.update.mockResolvedValue({ ...exercise, isActive: false });

    const result = await service.deactivate('trainer-1', 'exercise-1', {});

    expect(prisma.exercise.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { isActive: false }
    }));
    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'EXERCISE_DEACTIVATED' }));
  });

  it('rejects editing another trainer custom exercise', async () => {
    prisma.exercise.findUnique.mockResolvedValue({ ...exercise, trainerId: 'trainer-2' });

    await expect(service.update('trainer-1', 'exercise-1', {
      name: 'Editado',
      category: 'SNATCH',
      prescriptionType: 'LOAD',
      prBase: 'SNATCH',
      canUpdatePersonalRecord: false
    }, {})).rejects.toBeInstanceOf(ForbiddenException);

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'EXERCISE_ACCESS_DENIED' }));
  });

  it('rejects duplicating missing system exercise', async () => {
    prisma.exercise.findFirst.mockResolvedValue(null);

    await expect(service.duplicateSystemExercise('trainer-1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('duplicates system exercise as trainer custom exercise', async () => {
    prisma.exercise.findFirst.mockResolvedValue({ ...exercise, id: 'system-1', isSystem: true, trainerId: null });
    prisma.exercise.create.mockResolvedValue({ ...exercise, id: 'copy-1' });

    const result = await service.duplicateSystemExercise('trainer-1', 'system-1', {});

    expect(prisma.exercise.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ trainerId: 'trainer-1', isSystem: false })
    }));
    expect(result.id).toBe('copy-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'EXERCISE_DUPLICATED' }));
  });
});
