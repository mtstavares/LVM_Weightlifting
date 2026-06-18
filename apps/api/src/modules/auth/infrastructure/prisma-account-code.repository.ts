import { Injectable } from '@nestjs/common';
import {
  AccountCodeRecord,
  AccountCodeRepository
} from '../domain/account-code.repository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaAccountCodeRepository implements AccountCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceEmailVerificationCode(
    userId: string,
    codeHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.accountCode.updateMany({
        where: {
          userId,
          type: 'EMAIL_VERIFICATION',
          usedAt: null
        },
        data: {
          usedAt: new Date()
        }
      }),
      this.prisma.accountCode.create({
        data: {
          userId,
          type: 'EMAIL_VERIFICATION',
          codeHash,
          expiresAt
        }
      })
    ]);
  }

  findActiveEmailVerificationCode(userId: string): Promise<AccountCodeRecord | null> {
    return this.prisma.accountCode.findFirst({
      where: {
        userId,
        type: 'EMAIL_VERIFICATION',
        usedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.accountCode.update({
      where: { id },
      data: { usedAt: new Date() }
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.accountCode.update({
      where: { id },
      data: { attempts: { increment: 1 } }
    });
  }
}
