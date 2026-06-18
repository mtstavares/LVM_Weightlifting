import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  let prisma: any;
  let service: AuditLogsService;

  beforeEach(() => {
    prisma = {
      athlete: { findUnique: jest.fn() },
      authAuditLog: { findMany: jest.fn().mockResolvedValue([]) }
    };
    service = new AuditLogsService(prisma as PrismaService);
  });

  it('lists only trainer-related logs with filters ordered newest first', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ coachId: 'trainer-1', userId: 'user-2' });
    prisma.authAuditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        event: 'ATHLETE_DEACTIVATED',
        description: 'Treinador desativou atleta.',
        result: 'SUCCESS',
        actorUser: null,
        affectedUser: null,
        email: null,
        ipAddress: '127.0.0.1',
        userAgent: 'browser',
        metadata: null,
        createdAt: new Date()
      }
    ]);
    await expect(
      service.listForTrainer('trainer-1', {
        athleteId: 'athlete-1',
        event: 'ATHLETE_DEACTIVATED',
        result: 'SUCCESS',
        dateFrom: '2026-01-01'
      })
    ).resolves.toEqual([expect.objectContaining({ id: 'log-1' })]);
    expect(prisma.authAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 200
      })
    );

    prisma.authAuditLog.findMany.mockResolvedValue([]);
    await expect(
      service.listForTrainer('trainer-1', { dateTo: '2026-12-31' })
    ).resolves.toEqual([]);
  });

  it('rejects unknown and cross-trainer athlete filters', async () => {
    prisma.athlete.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.listForTrainer('trainer-1', { athleteId: 'missing' })
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.athlete.findUnique.mockResolvedValueOnce({ coachId: 'trainer-2', userId: 'user-2' });
    await expect(
      service.listForTrainer('trainer-1', { athleteId: 'athlete-1' })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
