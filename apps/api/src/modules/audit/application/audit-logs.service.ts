import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ListAuditLogsQueryDto } from '../presentation/dto/list-audit-logs-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForTrainer(trainerId: string, filters: ListAuditLogsQueryDto) {
    let affectedUserId: string | undefined;
    if (filters.athleteId) {
      const athlete = await this.prisma.athlete.findUnique({
        where: { id: filters.athleteId },
        select: { coachId: true, userId: true }
      });
      if (!athlete) throw new NotFoundException('Athlete not found.');
      if (athlete.coachId !== trainerId) {
        throw new ForbiddenException('Athlete does not belong to this trainer.');
      }
      affectedUserId = athlete.userId;
    }

    const createdAt: Prisma.DateTimeFilter | undefined =
      filters.dateFrom || filters.dateTo
        ? {
            gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            lte: filters.dateTo ? new Date(filters.dateTo) : undefined
          }
        : undefined;

    const logs = await this.prisma.authAuditLog.findMany({
      where: {
        event: filters.event,
        result: filters.result,
        createdAt,
        affectedUserId,
        OR: [
          { actorUserId: trainerId },
          { userId: trainerId },
          {
            affectedUser: {
              athleteProfile: {
                coachId: trainerId
              }
            }
          }
        ]
      },
      include: {
        actorUser: { select: { id: true, fullName: true, role: true } },
        affectedUser: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return logs.map((log) => ({
      id: log.id,
      event: log.event,
      description: log.description,
      result: log.result,
      actor: log.actorUser,
      affectedUser: log.affectedUser,
      email: log.email,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      details: log.metadata,
      createdAt: log.createdAt
    }));
  }
}
