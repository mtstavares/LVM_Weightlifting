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
    const blockedKeys = ['password', 'token', 'code', 'secret', 'authorization'];
    const sanitize = (value: Prisma.InputJsonValue): Prisma.InputJsonValue | undefined => {
      if (Array.isArray(value)) {
        return value
          .map((item) => sanitize(item))
          .filter((item): item is Prisma.InputJsonValue => item !== undefined);
      }
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked)))
          .map(([key, item]) => [key, sanitize(item as Prisma.InputJsonValue)])
          .filter(([, item]) => item !== undefined)
      );
    };
    return metadata === undefined ? undefined : sanitize(metadata);
  }
}
