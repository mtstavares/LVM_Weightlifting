import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../shared/application/audit.service';
import { MailService } from '../../../shared/domain/mail.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { BcryptPasswordHasher } from '../../auth/infrastructure/bcrypt-password-hasher';
import { AthletesService } from './athletes.service';

const athlete = {
  id: 'athlete-1',
  coachId: 'trainer-1',
  userId: 'user-2',
  firstName: 'Joao',
  lastName: 'Silva',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  profilePhoto: null,
  birthDate: null,
  weightCategory: null,
  user: {
    id: 'user-2',
    fullName: 'Joao Silva',
    email: 'joao@lvm.local'
  }
};

describe('AthletesService', () => {
  let prisma: any;
  let service: AthletesService;
  let mail: jest.Mocked<MailService>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      athlete: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      $transaction: jest.fn()
    };
    mail = { send: jest.fn() };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    const hasher = { hash: jest.fn().mockResolvedValue('hash') } as unknown as BcryptPasswordHasher;
    service = new AthletesService(prisma as PrismaService, hasher, mail, audit);
  });

  it('creates an athlete linked to the authenticated trainer', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback: (transaction: any) => unknown) =>
      callback({
        user: { create: jest.fn().mockResolvedValue(athlete.user) },
        athlete: { create: jest.fn().mockResolvedValue(athlete) }
      })
    );

    await expect(
      service.create('trainer-1', 'Joao Silva', 'JOAO@LVM.LOCAL')
    ).resolves.toMatchObject({
      trainerId: 'trainer-1',
      email: 'joao@lvm.local'
    });
    expect(mail.send).toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValue(athlete.user);
    await expect(
      service.create('trainer-1', 'Joao Silva', 'joao@lvm.local')
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists only trainer-owned athletes', async () => {
    prisma.athlete.findMany.mockResolvedValue([athlete]);
    await expect(service.listForTrainer('trainer-1')).resolves.toHaveLength(1);
    expect(prisma.athlete.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { coachId: 'trainer-1' } })
    );
  });

  it('returns 403 for cross-trainer access', async () => {
    prisma.athlete.findUnique.mockResolvedValue(athlete);
    await expect(service.getForTrainer('trainer-2', athlete.id)).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ACCESS_DENIED' })
    );
  });

  it('returns 404 for absent athlete and allows owner', async () => {
    prisma.athlete.findUnique.mockResolvedValueOnce(null);
    await expect(service.getForTrainer('trainer-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException
    );
    prisma.athlete.findUnique.mockResolvedValueOnce(athlete);
    await expect(service.getForTrainer('trainer-1', athlete.id)).resolves.toMatchObject({
      id: athlete.id
    });
  });

  it('returns only the authenticated athlete profile', async () => {
    prisma.athlete.findUnique.mockResolvedValue(athlete);
    await expect(service.getOwnProfile('user-2')).resolves.toMatchObject({
      userId: 'user-2'
    });
    expect(prisma.athlete.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-2' } })
    );

    prisma.athlete.findUnique.mockResolvedValue(null);
    await expect(service.getOwnProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates only an owned athlete', async () => {
    prisma.athlete.findUnique.mockResolvedValue(athlete);
    prisma.athlete.update.mockResolvedValue({
      ...athlete,
      isActive: false,
      user: { ...athlete.user, fullName: 'Joao Souza' }
    });
    await expect(
      service.updateForTrainer('trainer-1', athlete.id, {
        fullName: 'Joao Souza',
        isActive: false
      })
    ).resolves.toMatchObject({ fullName: 'Joao Souza', isActive: false });
  });
});
