import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { BcryptPasswordHasher } from '../../auth/infrastructure/bcrypt-password-hasher';
import { MAIL_SERVICE, MailService } from '../../../shared/domain/mail.service';
import { AuditService } from '../../../shared/application/audit.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AthletesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: BcryptPasswordHasher,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    private readonly audit: AuditService
  ) {}

  async create(trainerId: string, fullName: string, email: string, ipAddress?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email: normalizedEmail } })) {
      throw new ConflictException('Email already in use.');
    }

    const temporaryPassword = `Lvm!${randomBytes(7).toString('base64url')}`;
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

    await this.mail.send({
      to: normalizedEmail,
      subject: 'Primeiro acesso - LVM Weightlifting',
      text: `Seu treinador criou sua conta. Sua senha temporaria e ${temporaryPassword}. Ela expira em 30 minutos e pode ser usada uma unica vez.`,
      html: `<p>Seu treinador criou sua conta.</p><p>Sua senha temporaria e:</p><p><strong>${temporaryPassword}</strong></p><p>Ela expira em 30 minutos e pode ser usada uma unica vez.</p>`
    });
    await this.audit.record({
      event: 'ATHLETE_CREATED',
      userId: trainerId,
      email: normalizedEmail,
      ipAddress,
      metadata: { athleteId: athlete.id }
    });

    return this.toResponse(athlete);
  }

  async listForTrainer(trainerId: string) {
    const athletes = await this.prisma.athlete.findMany({
      where: { coachId: trainerId },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    return athletes.map((athlete) => this.toResponse(athlete));
  }

  async getForTrainer(trainerId: string, athleteId: string) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { id: athleteId },
      include: { user: true }
    });
    if (!athlete) {
      throw new NotFoundException('Athlete not found.');
    }
    if (athlete.coachId !== trainerId) {
      await this.audit.record({
        event: 'ACCESS_DENIED',
        userId: trainerId,
        metadata: { athleteId }
      });
      throw new ForbiddenException('Athlete does not belong to this trainer.');
    }
    return this.toResponse(athlete);
  }

  async updateForTrainer(
    trainerId: string,
    athleteId: string,
    input: { fullName?: string; isActive?: boolean }
  ) {
    await this.getForTrainer(trainerId, athleteId);
    const names = input.fullName ? this.splitName(input.fullName) : undefined;
    const athlete = await this.prisma.athlete.update({
      where: { id: athleteId },
      data: {
        firstName: names?.firstName,
        lastName: names?.lastName,
        isActive: input.isActive,
        user: {
          update: {
            fullName: input.fullName?.trim(),
            isActive: input.isActive
          }
        }
      },
      include: { user: true }
    });
    return this.toResponse(athlete);
  }

  async getOwnProfile(userId: string) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { userId },
      include: { user: true }
    });
    if (!athlete) {
      throw new NotFoundException('Athlete profile not found.');
    }
    return this.toResponse(athlete);
  }

  private splitName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    return {
      firstName: parts.shift() ?? '',
      lastName: parts.join(' ') || '-'
    };
  }

  private toResponse(athlete: {
    id: string;
    coachId: string;
    isActive: boolean;
    createdAt: Date;
    user: { id: string; fullName: string; email: string };
  }) {
    return {
      id: athlete.id,
      userId: athlete.user.id,
      trainerId: athlete.coachId,
      fullName: athlete.user.fullName,
      email: athlete.user.email,
      isActive: athlete.isActive,
      createdAt: athlete.createdAt
    };
  }
}
