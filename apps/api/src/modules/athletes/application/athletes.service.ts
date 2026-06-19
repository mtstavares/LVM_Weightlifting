import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService } from '../../../shared/application/audit.service';
import { MAIL_SERVICE, MailService } from '../../../shared/domain/mail.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { BcryptPasswordHasher } from '../../auth/infrastructure/bcrypt-password-hasher';
import { AthleteStatus } from '../presentation/dto/list-athletes-query.dto';

type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AthletesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: BcryptPasswordHasher,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    private readonly audit: AuditService
  ) {}

  async create(
    trainerId: string,
    fullName: string,
    email: string,
    context: RequestContext = {}
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email: normalizedEmail } })) {
      throw new ConflictException('Email already in use.');
    }

    const trainer = await this.prisma.user.findUniqueOrThrow({ where: { id: trainerId } });
    const temporaryPassword = this.generateTemporaryPassword();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const names = this.splitName(fullName);
    const passwordHash = await this.passwordHasher.hash(temporaryPassword);
    const athlete = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          fullName: fullName.trim(),
          email: normalizedEmail,
          passwordHash,
          role: UserRole.ATHLETE,
          isActive: true,
          emailVerifiedAt: new Date(),
          mustChangePassword: true,
          temporaryPasswordExpiresAt: expiresAt
        }
      });
      return transaction.athlete.create({
        data: {
          coachId: trainerId,
          userId: user.id,
          firstName: names.firstName,
          lastName: names.lastName
        },
        include: { user: true }
      });
    });

    await this.sendInvitation(normalizedEmail, temporaryPassword);
    await this.audit.record({
      event: 'ATHLETE_CREATED',
      userId: trainerId,
      actorUserId: trainerId,
      affectedUserId: athlete.userId,
      email: normalizedEmail,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Treinador ${trainer.fullName} cadastrou o atleta ${athlete.user.fullName}.`,
      metadata: { athleteId: athlete.id }
    });

    return this.toResponse(athlete);
  }

  async listForTrainer(
    trainerId: string,
    filters: { search?: string; status?: AthleteStatus } = {}
  ) {
    const search = filters.search?.trim();
    const athletes = await this.prisma.athlete.findMany({
      where: {
        coachId: trainerId,
        ...(search
          ? {
              user: {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          : {})
      },
      include: { user: true },
      orderBy: { user: { fullName: 'asc' } }
    });

    return athletes
      .map((athlete) => this.toResponse(athlete))
      .filter((athlete) => !filters.status || athlete.status === filters.status);
  }

  async getForTrainer(trainerId: string, athleteId: string) {
    return this.toResponse(await this.requireOwnedAthlete(trainerId, athleteId));
  }

  async updateForTrainer(
    trainerId: string,
    athleteId: string,
    input: { fullName?: string },
    context: RequestContext = {}
  ) {
    const current = await this.requireOwnedAthlete(trainerId, athleteId);
    const trainer = await this.prisma.user.findUniqueOrThrow({ where: { id: trainerId } });
    if (current.user.firstLoginAt && !current.user.mustChangePassword) {
      await this.audit.record({
        event: 'TRAINER_PROTECTED_EDIT_DENIED',
        userId: trainerId,
        actorUserId: trainerId,
        affectedUserId: current.userId,
        email: current.user.email,
        result: 'FAILURE',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        description: `Treinador ${trainer.fullName} tentou alterar dados protegidos do atleta ${current.user.fullName}.`,
        metadata: { athleteId, fields: Object.keys(input) }
      });
      throw new ForbiddenException(
        'Athlete profile can only be edited by the athlete after the first login.'
      );
    }
    const names = input.fullName ? this.splitName(input.fullName) : undefined;
    const athlete = await this.prisma.athlete.update({
      where: { id: athleteId },
      data: {
        firstName: names?.firstName,
        lastName: names?.lastName,
        user: { update: { fullName: input.fullName?.trim() } }
      },
      include: { user: true }
    });
    await this.audit.record({
      event: 'ATHLETE_UPDATED',
      userId: trainerId,
      actorUserId: trainerId,
      affectedUserId: athlete.userId,
      email: athlete.user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Treinador ${trainer.fullName} alterou os dados do atleta ${athlete.user.fullName}.`,
      metadata: {
        athleteId,
        previousFullName: current.user.fullName,
        currentFullName: athlete.user.fullName
      }
    });
    return this.toResponse(athlete);
  }

  async deactivate(
    trainerId: string,
    athleteId: string,
    reason?: string,
    context: RequestContext = {}
  ) {
    const current = await this.requireOwnedAthlete(trainerId, athleteId);
    const trainer = await this.prisma.user.findUniqueOrThrow({ where: { id: trainerId } });
    const athlete = await this.prisma.$transaction(async (transaction) => {
      await transaction.refreshToken.updateMany({
        where: { userId: current.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      return transaction.athlete.update({
        where: { id: athleteId },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: reason?.trim() || null,
          user: { update: { isActive: false } }
        },
        include: { user: true }
      });
    });
    await this.audit.record({
      event: 'ATHLETE_DEACTIVATED',
      userId: trainerId,
      actorUserId: trainerId,
      affectedUserId: athlete.userId,
      email: athlete.user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Treinador ${trainer.fullName} desativou o atleta ${athlete.user.fullName}.${reason ? ` Motivo: ${reason.trim()}.` : ''}`,
      metadata: { athleteId, reason: reason?.trim() || null }
    });
    return this.toResponse(athlete);
  }

  async reactivate(trainerId: string, athleteId: string, context: RequestContext = {}) {
    await this.requireOwnedAthlete(trainerId, athleteId);
    const trainer = await this.prisma.user.findUniqueOrThrow({ where: { id: trainerId } });
    const athlete = await this.prisma.athlete.update({
      where: { id: athleteId },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivationReason: null,
        user: { update: { isActive: true } }
      },
      include: { user: true }
    });
    await this.audit.record({
      event: 'ATHLETE_REACTIVATED',
      userId: trainerId,
      actorUserId: trainerId,
      affectedUserId: athlete.userId,
      email: athlete.user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Treinador ${trainer.fullName} reativou o atleta ${athlete.user.fullName}.`,
      metadata: { athleteId }
    });
    return this.toResponse(athlete);
  }

  async resendInvitation(trainerId: string, athleteId: string, context: RequestContext = {}) {
    const athlete = await this.requireOwnedAthlete(trainerId, athleteId);
    if (athlete.user.firstLoginAt) {
      throw new ForbiddenException('Invitation can only be resent before the first login.');
    }
    const trainer = await this.prisma.user.findUniqueOrThrow({ where: { id: trainerId } });
    const temporaryPassword = this.generateTemporaryPassword();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: athlete.userId },
        data: {
          passwordHash: await this.passwordHasher.hash(temporaryPassword),
          mustChangePassword: true,
          temporaryPasswordExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
          temporaryPasswordUsedAt: null
        }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: athlete.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);
    await this.sendInvitation(athlete.user.email, temporaryPassword);
    await this.audit.record({
      event: 'ATHLETE_INVITATION_RESENT',
      userId: trainerId,
      actorUserId: trainerId,
      affectedUserId: athlete.userId,
      email: athlete.user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Treinador ${trainer.fullName} reenviou o convite do atleta ${athlete.user.fullName}.`,
      metadata: { athleteId }
    });
  }

  async getOwnProfile(userId: string) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { userId },
      include: { user: true }
    });
    if (!athlete) throw new NotFoundException('Athlete profile not found.');
    return this.toResponse(athlete);
  }

  private async requireOwnedAthlete(trainerId: string, athleteId: string) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { id: athleteId },
      include: { user: true }
    });
    if (!athlete) throw new NotFoundException('Athlete not found.');
    if (athlete.coachId !== trainerId) {
      await this.audit.record({
        event: 'ACCESS_DENIED',
        userId: trainerId,
        actorUserId: trainerId,
        affectedUserId: athlete.userId,
        result: 'FAILURE',
        description: `Tentativa de acesso a atleta vinculado a outro treinador.`,
        metadata: { athleteId }
      });
      throw new ForbiddenException('Athlete does not belong to this trainer.');
    }
    return athlete;
  }

  private calculateStatus(athlete: {
    isActive: boolean;
    user: {
      isActive: boolean;
      firstLoginAt: Date | null;
      mustChangePassword: boolean;
    };
  }): AthleteStatus {
    if (!athlete.isActive || !athlete.user.isActive) return 'INATIVO';
    if (!athlete.user.firstLoginAt) return 'CONVITE_ENVIADO';
    if (athlete.user.mustChangePassword) return 'PRIMEIRO_LOGIN_PENDENTE';
    return 'ATIVO';
  }

  private splitName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    return { firstName: parts.shift() ?? '', lastName: parts.join(' ') || '-' };
  }

  private generateTemporaryPassword(): string {
    return `Lvm!${randomBytes(7).toString('base64url')}`;
  }

  private sendInvitation(email: string, temporaryPassword: string) {
    return this.mail.send({
      to: email,
      subject: 'Primeiro acesso - LVM Weightlifting',
      text: `Sua senha temporaria e ${temporaryPassword}. Ela expira em 30 minutos e pode ser usada uma unica vez.`,
      html: `<p>Sua senha temporaria e:</p><p><strong>${temporaryPassword}</strong></p><p>Ela expira em 30 minutos e pode ser usada uma unica vez.</p>`
    });
  }

  private toResponse(athlete: {
    id: string;
    userId: string;
    coachId: string;
    profilePhoto: string | null;
    isActive: boolean;
    deactivatedAt: Date | null;
    deactivationReason: string | null;
    createdAt: Date;
    user: {
      id: string;
      fullName: string;
      email: string;
      isActive: boolean;
      firstLoginAt: Date | null;
      lastLoginAt: Date | null;
      lastPasswordChangeAt: Date | null;
      mustChangePassword: boolean;
    };
  }) {
    return {
      id: athlete.id,
      userId: athlete.user.id,
      trainerId: athlete.coachId,
      fullName: athlete.user.fullName,
      email: athlete.user.email,
      profilePhotoUrl: athlete.profilePhoto ? `/storage/${athlete.profilePhoto}` : null,
      status: this.calculateStatus(athlete),
      isActive: athlete.isActive && athlete.user.isActive,
      createdAt: athlete.createdAt,
      firstLoginAt: athlete.user.firstLoginAt,
      lastPasswordChangeAt: athlete.user.lastPasswordChangeAt,
      lastAccessAt: athlete.user.lastLoginAt,
      deactivatedAt: athlete.deactivatedAt,
      deactivationReason: athlete.deactivationReason
    };
  }
}
