import { Injectable } from '@nestjs/common';
import { AuthUser } from '../domain/auth.types';
import { UserRepository } from '../domain/user.repository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createTrainer(fullName: string, email: string, passwordHash: string): Promise<AuthUser> {
    return this.prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: 'TRAINER',
        isActive: false,
        coachSettings: {
          create: {}
        }
      }
    });
  }

  markEmailVerified(userId: string): Promise<AuthUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        isActive: true
      }
    });
  }

  updatePassword(userId: string, passwordHash: string): Promise<AuthUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
        temporaryPasswordUsedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });
  }

  setTemporaryPassword(userId: string, passwordHash: string, expiresAt: Date): Promise<AuthUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: expiresAt,
        temporaryPasswordUsedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });
  }

  markTemporaryPasswordUsed(userId: string): Promise<AuthUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { temporaryPasswordUsedAt: new Date() }
    });
  }

  async recordFailedLogin(userId: string, lockedUntil: Date | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        lockedUntil
      }
    });
  }

  async resetFailedLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });
  }
}
