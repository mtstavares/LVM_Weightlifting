import { Injectable } from '@nestjs/common';
import { AuthAuditEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    event: AuthAuditEvent;
    userId?: string;
    email?: string;
    ipAddress?: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.authAuditLog.create({
      data: input
    });
  }
}
