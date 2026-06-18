import { Injectable } from '@nestjs/common';
import { AuditResult, AuthAuditEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    event: AuthAuditEvent;
    userId?: string;
    actorUserId?: string;
    affectedUserId?: string;
    email?: string;
    description?: string;
    result?: AuditResult;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.authAuditLog.create({
      data: {
        ...input,
        description: input.description ?? this.defaultDescription(input.event, input.email),
        metadata: this.sanitizeMetadata(input.metadata)
      }
    });
  }

  private defaultDescription(event: AuthAuditEvent, email?: string): string {
    return `${event.replaceAll('_', ' ').toLowerCase()}${email ? `: ${email}` : ''}.`;
  }

  private sanitizeMetadata(metadata?: Prisma.InputJsonValue): Prisma.InputJsonValue | undefined {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
      return metadata;
    }

    const blockedKeys = ['password', 'token', 'code', 'secret', 'authorization'];
    return Object.fromEntries(
      Object.entries(metadata).filter(
        ([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked))
      )
    );
  }
}
