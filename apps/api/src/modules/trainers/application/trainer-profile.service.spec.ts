import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../shared/application/audit.service';
import { FileStorageService } from '../../../shared/domain/file-storage.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { TrainerProfileService } from './trainer-profile.service';

const trainer = {
  id: 'trainer-1',
  fullName: 'Maria Trainer',
  email: 'maria@lvm.local',
  isActive: true,
  coachSettings: {
    profilePhoto: null,
    birthDate: new Date('1990-06-10'),
    gym: 'LVM Box',
    bio: 'Treinadora'
  }
};

function image() {
  const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return {
    fieldname: 'photo',
    originalname: 'trainer.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: buffer.length,
    buffer,
    stream: null as never,
    destination: '',
    filename: '',
    path: ''
  };
}

describe('TrainerProfileService', () => {
  let prisma: any;
  let storage: jest.Mocked<FileStorageService>;
  let audit: jest.Mocked<AuditService>;
  let service: TrainerProfileService;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn()
      }
    };
    storage = {
      upload: jest.fn().mockResolvedValue({
        path: 'photos/trainer.png',
        url: '/storage/photos/trainer.png'
      }),
      delete: jest.fn(),
      getUrl: jest.fn((path) => `/storage/${path}`)
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new TrainerProfileService(prisma as PrismaService, storage, audit);
  });

  it('returns only an active trainer profile with calculated age', async () => {
    prisma.user.findFirst.mockResolvedValue(trainer);
    await expect(service.getOwn(trainer.id)).resolves.toMatchObject({
      fullName: trainer.fullName,
      age: expect.any(Number),
      gym: 'LVM Box'
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: trainer.id, role: 'TRAINER', isActive: true }
      })
    );

    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.getOwn('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates profile data and records readable audit', async () => {
    prisma.user.findFirst.mockResolvedValue(trainer);
    prisma.user.update.mockResolvedValue({
      ...trainer,
      fullName: 'Maria Silva',
      coachSettings: {
        ...trainer.coachSettings,
        gym: 'Nova Academia'
      }
    });

    await expect(
      service.updateOwn(trainer.id, {
        fullName: 'Maria Silva',
        birthDate: '1990-06-10',
        gym: 'Nova Academia',
        bio: ' Treinadora de LPO '
      })
    ).resolves.toMatchObject({ fullName: 'Maria Silva', gym: 'Nova Academia' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'TRAINER_PROFILE_UPDATED' })
    );
  });

  it('validates and replaces trainer photo', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...trainer,
      coachSettings: { ...trainer.coachSettings, profilePhoto: 'photos/old.png' }
    });
    prisma.user.update.mockResolvedValue({
      ...trainer,
      coachSettings: { ...trainer.coachSettings, profilePhoto: 'photos/trainer.png' }
    });

    await service.updateOwn(
      trainer.id,
      { fullName: trainer.fullName, birthDate: '1990-06-10' },
      image()
    );
    expect(storage.delete).toHaveBeenCalledWith('photos/old.png');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'TRAINER_PHOTO_UPDATED' })
    );
  });

  it('rejects future birth dates and invalid images', async () => {
    prisma.user.findFirst.mockResolvedValue(trainer);
    await expect(
      service.updateOwn(trainer.id, {
        fullName: trainer.fullName,
        birthDate: '2999-01-01'
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateOwn(
        trainer.id,
        { fullName: trainer.fullName },
        { ...image(), buffer: Buffer.from('fake') }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
