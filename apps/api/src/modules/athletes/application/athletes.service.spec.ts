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
  deactivatedAt: null,
  deactivationReason: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  profilePhoto: null,
  birthDate: null,
  weightCategory: null,
  user: {
    id: 'user-2',
    fullName: 'Joao Silva',
    email: 'joao@lvm.local',
    isActive: true,
    firstLoginAt: null,
    lastLoginAt: null,
    lastPasswordChangeAt: null,
    mustChangePassword: true
  }
};

const trainer = { id: 'trainer-1', fullName: 'Matheus Trainer' };

describe('AthletesService', () => {
  let prisma: any;
  let service: AthletesService;
  let mail: jest.Mocked<MailService>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue(trainer),
        update: jest.fn()
      },
      athlete: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      refreshToken: { updateMany: jest.fn() },
      $transaction: jest.fn()
    };
    mail = { send: jest.fn() };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    const hasher = { hash: jest.fn().mockResolvedValue('hash') } as unknown as BcryptPasswordHasher;
    service = new AthletesService(prisma as PrismaService, hasher, mail, audit);
  });

  it('creates athlete with invitation status and blocks duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback: (transaction: any) => unknown) =>
      callback({
        user: { create: jest.fn().mockResolvedValue(athlete.user) },
        athlete: { create: jest.fn().mockResolvedValue(athlete) }
      })
    );
    await expect(service.create('trainer-1', 'Joao Silva', 'JOAO@LVM.LOCAL')).resolves.toMatchObject({
      status: 'CONVITE_ENVIADO',
      trainerId: 'trainer-1'
    });
    expect(mail.send).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ATHLETE_CREATED', affectedUserId: athlete.userId })
    );

    prisma.user.findUnique.mockResolvedValue(athlete.user);
    await expect(service.create('trainer-1', 'Joao Silva', athlete.user.email)).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it('filters by trainer, search and calculated status in alphabetical order', async () => {
    prisma.athlete.findMany.mockResolvedValue([
      athlete,
      {
        ...athlete,
        id: 'athlete-2',
        user: {
          ...athlete.user,
          id: 'user-3',
          fullName: 'Ana Ativa',
          firstLoginAt: new Date(),
          mustChangePassword: false,
          lastPasswordChangeAt: new Date()
        }
      }
    ]);
    await expect(
      service.listForTrainer('trainer-1', { search: 'ana', status: 'ATIVO' })
    ).resolves.toEqual([expect.objectContaining({ fullName: 'Ana Ativa', status: 'ATIVO' })]);
    expect(prisma.athlete.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ coachId: 'trainer-1' }),
        orderBy: { user: { fullName: 'asc' } }
      })
    );

    prisma.athlete.findMany.mockResolvedValue([
      { ...athlete, isActive: false, user: { ...athlete.user, isActive: false } },
      {
        ...athlete,
        id: 'athlete-3',
        user: { ...athlete.user, id: 'user-4', firstLoginAt: new Date(), mustChangePassword: true }
      }
    ]);
    await expect(service.listForTrainer('trainer-1')).resolves.toEqual([
      expect.objectContaining({ status: 'INATIVO' }),
      expect.objectContaining({ status: 'PRIMEIRO_LOGIN_PENDENTE' })
    ]);
  });

  it('returns 403 for cross-trainer access and 404 when absent', async () => {
    prisma.athlete.findUnique.mockResolvedValueOnce(athlete);
    await expect(service.getForTrainer('trainer-2', athlete.id)).rejects.toBeInstanceOf(
      ForbiddenException
    );
    prisma.athlete.findUnique.mockResolvedValueOnce(null);
    await expect(service.getForTrainer('trainer-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('updates owned athlete and writes readable audit', async () => {
    prisma.athlete.findUnique.mockResolvedValue(athlete);
    prisma.athlete.update.mockResolvedValue({
      ...athlete,
      user: { ...athlete.user, fullName: 'Joao Souza' }
    });
    await expect(
      service.updateForTrainer('trainer-1', athlete.id, { fullName: 'Joao Souza' })
    ).resolves.toMatchObject({ fullName: 'Joao Souza' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ATHLETE_UPDATED',
        description: expect.stringContaining('Matheus Trainer')
      })
    );

    prisma.athlete.update.mockResolvedValue(athlete);
    await expect(service.updateForTrainer('trainer-1', athlete.id, {})).resolves.toMatchObject({
      fullName: athlete.user.fullName
    });
  });

  it('deactivates without deletion, revokes sessions and reactivates', async () => {
    prisma.athlete.findUnique.mockResolvedValue(athlete);
    const inactive = {
      ...athlete,
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: 'Saiu da equipe',
      user: { ...athlete.user, isActive: false }
    };
    prisma.$transaction.mockImplementationOnce(async (callback: (transaction: any) => unknown) =>
      callback({
        refreshToken: { updateMany: jest.fn() },
        athlete: { update: jest.fn().mockResolvedValue(inactive) }
      })
    );
    await expect(
      service.deactivate('trainer-1', athlete.id, 'Saiu da equipe')
    ).resolves.toMatchObject({ status: 'INATIVO', deactivationReason: 'Saiu da equipe' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ATHLETE_DEACTIVATED' })
    );

    prisma.$transaction.mockImplementationOnce(async (callback: (transaction: any) => unknown) =>
      callback({
        refreshToken: { updateMany: jest.fn() },
        athlete: {
          update: jest.fn().mockResolvedValue({
            ...inactive,
            deactivationReason: null
          })
        }
      })
    );
    await expect(service.deactivate('trainer-1', athlete.id)).resolves.toMatchObject({
      deactivationReason: null
    });

    prisma.athlete.update.mockResolvedValue(athlete);
    await expect(service.reactivate('trainer-1', athlete.id)).resolves.toMatchObject({
      status: 'CONVITE_ENVIADO'
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ATHLETE_REACTIVATED' })
    );
  });

  it('resends invitation and returns own athlete profile', async () => {
    prisma.athlete.findUnique.mockResolvedValue(athlete);
    prisma.$transaction.mockResolvedValue([]);
    await service.resendInvitation('trainer-1', athlete.id);
    expect(mail.send).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ATHLETE_INVITATION_RESENT' })
    );

    await expect(service.getOwnProfile(athlete.userId)).resolves.toMatchObject({
      userId: athlete.userId
    });
    prisma.athlete.findUnique.mockResolvedValue(null);
    await expect(service.getOwnProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
