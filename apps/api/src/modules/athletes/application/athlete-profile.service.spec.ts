import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../shared/application/audit.service';
import { FileStorageService } from '../../../shared/domain/file-storage.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { AthleteProfileService } from './athlete-profile.service';

const profile = {
  id: 'athlete-1',
  userId: 'athlete-user-1',
  coachId: 'trainer-1',
  firstName: 'Joao',
  lastName: 'Silva',
  profilePhoto: null,
  birthDate: null,
  sex: null,
  weightCategory: null,
  competitiveLevel: null,
  profileStatus: 'PROFILE_INCOMPLETE' as const,
  profileCompletedAt: null,
  isActive: true,
  deactivatedAt: null,
  deactivationReason: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  user: {
    fullName: 'Joao Silva',
    email: 'joao@lvm.local',
    isActive: true
  },
  personalRecords: []
};

const input = {
  fullName: 'Joao da Silva',
  birthDate: '2000-06-10',
  sex: 'MALE' as const,
  weightCategory: '70',
  competitiveLevel: 'NATIONAL' as const
};

function image(mimetype = 'image/png', buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
  return {
    fieldname: 'photo',
    originalname: 'profile.png',
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    stream: null as never,
    destination: '',
    filename: '',
    path: ''
  };
}

describe('AthleteProfileService', () => {
  let prisma: any;
  let storage: jest.Mocked<FileStorageService>;
  let audit: jest.Mocked<AuditService>;
  let service: AthleteProfileService;

  beforeEach(() => {
    prisma = {
      athlete: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      personalRecord: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        findUniqueOrThrow: jest.fn()
      },
      personalRecordHistory: { create: jest.fn() },
      $transaction: jest.fn(async (input: any) =>
        typeof input === 'function' ? input(prisma) : Promise.all(input)
      )
    };
    storage = {
      upload: jest.fn().mockResolvedValue({
        path: 'photos/profile.png',
        url: '/storage/photos/profile.png'
      }),
      delete: jest.fn(),
      getUrl: jest.fn((path) => `/storage/${path}`),
      read: jest.fn()
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new AthleteProfileService(prisma as PrismaService, storage, audit);
  });

  it('returns own profile with calculated age and handles missing profiles', async () => {
    prisma.athlete.findUnique.mockResolvedValue({
      ...profile,
      birthDate: new Date('2000-06-10'),
      profilePhoto: 'photos/profile.png'
    });
    await expect(service.getOwn(profile.userId)).resolves.toMatchObject({
      age: expect.any(Number),
      profilePhotoUrl: '/storage/photos/profile.png'
    });

    prisma.athlete.findUnique.mockResolvedValue(null);
    await expect(service.getOwn('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('completes the profile with a validated image and audit log', async () => {
    prisma.athlete.findUnique.mockResolvedValue(profile);
    prisma.athlete.update.mockResolvedValue({
      ...profile,
      ...input,
      birthDate: new Date(input.birthDate),
      profilePhoto: 'photos/profile.png',
      profileStatus: 'PROFILE_COMPLETE'
    });

    await expect(service.completeOwn(profile.userId, input, image())).resolves.toMatchObject({
      profileStatus: 'PROFILE_COMPLETE',
      weightCategory: '70'
    });
    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'image/png', folder: 'photos' })
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ATHLETE_PROFILE_COMPLETED' })
    );
  });

  it('updates profile and replaces only the athlete photo', async () => {
    const completed = {
      ...profile,
      profilePhoto: 'photos/old.png',
      profileStatus: 'PROFILE_COMPLETE' as const
    };
    prisma.athlete.findUnique.mockResolvedValue(completed);
    prisma.athlete.update.mockResolvedValue({
      ...completed,
      ...input,
      birthDate: new Date(input.birthDate),
      profilePhoto: 'photos/profile.png'
    });

    await service.updateOwn(profile.userId, input, image());
    expect(storage.delete).toHaveBeenCalledWith('photos/old.png');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ATHLETE_PHOTO_UPDATED' })
    );

    prisma.athlete.update.mockResolvedValue({
      ...completed,
      ...input,
      birthDate: new Date(input.birthDate)
    });
    await service.updateOwn(profile.userId, input, undefined);
    expect(audit.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ event: 'ATHLETE_PROFILE_UPDATED' })
    );
  });

  it('validates completion, birth date, category, size and binary signature', async () => {
    prisma.athlete.findUnique.mockResolvedValue(profile);
    await expect(service.completeOwn(profile.userId, input, undefined)).rejects.toBeInstanceOf(
      BadRequestException
    );
    await expect(
      service.completeOwn(profile.userId, { ...input, birthDate: '2999-01-01' }, image())
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.completeOwn(profile.userId, { ...input, weightCategory: '49' }, image())
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.completeOwn(profile.userId, input, { ...image(), size: 6 * 1024 * 1024 })
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.completeOwn(profile.userId, input, image('image/png', Buffer.from('not-an-image')))
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.completeOwn(profile.userId, input, image('image/jpeg'))
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.athlete.findUnique.mockResolvedValue({
      ...profile,
      profileStatus: 'PROFILE_COMPLETE'
    });
    await expect(service.completeOwn(profile.userId, input, image())).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('allows trainer read-only access only to owned athletes', async () => {
    prisma.athlete.findUnique.mockResolvedValue(profile);
    await expect(service.getForTrainer('trainer-1', profile.id)).resolves.toMatchObject({
      id: profile.id
    });
    await expect(service.getForTrainer('trainer-2', profile.id)).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ACCESS_DENIED', result: 'FAILURE' })
    );

    prisma.athlete.findUnique.mockResolvedValue(null);
    await expect(service.getForTrainer('trainer-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('lists and upserts athlete-owned personal records with audit', async () => {
    const record = {
      id: 'pr-1',
      athleteId: profile.id,
      exercise: 'SNATCH',
      weight: 100,
      recordDate: new Date('2026-06-01'),
      notes: 'Competition',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    prisma.athlete.findUnique.mockResolvedValue(profile);
    prisma.personalRecord.findMany.mockResolvedValue([record]);
    await expect(service.listOwnPersonalRecords(profile.userId)).resolves.toEqual([record]);

    prisma.personalRecord.upsert.mockResolvedValue(record);
    prisma.personalRecord.findUniqueOrThrow.mockResolvedValue(record);
    await expect(
      service.upsertOwnPersonalRecord(
        profile.userId,
        'SNATCH',
        { weight: 100, recordDate: '2026-06-01', notes: ' Competition ' }
      )
    ).resolves.toEqual(record);
    expect(prisma.personalRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { athleteId_exercise: { athleteId: profile.id, exercise: 'SNATCH' } }
      })
    );
    expect(prisma.personalRecordHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ athleteId: profile.id, exercise: 'SNATCH', weight: 100 })
      })
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'PERSONAL_RECORD_UPSERTED' })
    );
  });
});
