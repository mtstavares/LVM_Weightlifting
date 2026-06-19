import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../domain/auth.types';
import { UserRepository } from '../domain/user.repository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

const authUserInclude = {
  athleteProfile: {
    select: {
      profileStatus: true
    }
  }
} satisfies Prisma.UserInclude;

type PrismaAuthUser = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email }, include: authUserInclude });
    return user ? this.map(user) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: authUserInclude });
    return user ? this.map(user) : null;
  }

  async createTrainer(fullName: string, email: string, passwordHash: string): Promise<AuthUser> {
    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: 'TRAINER',
        isActive: false,
        coachSettings: { create: {} }
      },
      include: authUserInclude
    });
    return this.map(user);
  }

  async markEmailVerified(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), isActive: true },
      include: authUserInclude
    });
    return this.map(user);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
        temporaryPasswordUsedAt: null,
        lastPasswordChangeAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null
      },
      include: authUserInclude
    });
    return this.map(user);
  }

  async setTemporaryPassword(
    userId: string,
    passwordHash: string,
    expiresAt: Date
  ): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: expiresAt,
        temporaryPasswordUsedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      },
      include: authUserInclude
    });
    return this.map(user);
  }

  async markTemporaryPasswordUsed(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { temporaryPasswordUsedAt: new Date() },
      include: authUserInclude
    });
    return this.map(user);
  }

  async recordFailedLogin(userId: string, lockedUntil: Date | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 }, lockedUntil }
    });
  }

  async resetFailedLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });
  }

  async recordSuccessfulLogin(userId: string, firstLogin: boolean): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        firstLoginAt: firstLogin ? new Date() : undefined,
        failedLoginAttempts: 0,
        lockedUntil: null
      },
      include: authUserInclude
    });
    return this.map(user);
  }

  private map(user: PrismaAuthUser): AuthUser {
    return {
      ...user,
      role: user.role,
      profileComplete:
        user.role === 'TRAINER' || user.athleteProfile?.profileStatus === 'PROFILE_COMPLETE'
    };
  }
}
