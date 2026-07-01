import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AthleteSex, CompetitiveLevel, PersonalRecordMovement } from '@prisma/client';
import { AuditService } from '../../../shared/application/audit.service';
import { FileStorageService } from '../../../shared/domain/file-storage.service';
import { validateProfileImage } from '../../../shared/domain/image-file';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { FILE_STORAGE_SERVICE } from '../../../shared/infrastructure/storage/storage.token';
import { WEIGHT_CATEGORIES } from '../domain/athlete-profile.constants';

type ProfileInput = {
  fullName: string;
  birthDate: string;
  sex: AthleteSex;
  weightCategory: string;
  competitiveLevel: CompetitiveLevel;
  gym?: string;
};

type Context = { ipAddress?: string; userAgent?: string };

@Injectable()
export class AthleteProfileService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE) private readonly storage: FileStorageService,
    private readonly audit: AuditService
  ) {}

  async getOwn(userId: string) {
    const athlete = await this.findByUserId(userId);
    return this.toProfile(athlete);
  }

  async completeOwn(
    userId: string,
    input: ProfileInput,
    photo: Express.Multer.File | undefined,
    context: Context = {}
  ) {
    const athlete = await this.findByUserId(userId);
    if (athlete.profileStatus === 'PROFILE_COMPLETE') {
      throw new BadRequestException('Profile is already complete.');
    }
    if (!photo && !athlete.profilePhoto) {
      throw new BadRequestException('Profile photo is required.');
    }
    this.validateBirthDate(input.birthDate);
    this.validateCategory(input.sex, input.weightCategory);
    const photoPath = photo ? await this.storePhoto(photo, athlete.profilePhoto) : athlete.profilePhoto;
    const updated = await this.updateProfile(athlete.id, input, photoPath, true);
    await this.audit.record({
      event: 'ATHLETE_PROFILE_COMPLETED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      email: athlete.user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Atleta ${input.fullName.trim()} finalizou o cadastro do perfil.`,
      metadata: { athleteId: athlete.id }
    });
    return this.toProfile(updated);
  }

  async updateOwn(
    userId: string,
    input: ProfileInput,
    photo: Express.Multer.File | undefined,
    context: Context = {}
  ) {
    const athlete = await this.findByUserId(userId);
    this.validateBirthDate(input.birthDate);
    this.validateCategory(input.sex, input.weightCategory);
    const photoPath = photo ? await this.storePhoto(photo, athlete.profilePhoto) : athlete.profilePhoto;
    const updated = await this.updateProfile(athlete.id, input, photoPath, false);
    await this.audit.record({
      event: photo ? 'ATHLETE_PHOTO_UPDATED' : 'ATHLETE_PROFILE_UPDATED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      email: athlete.user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Atleta ${input.fullName.trim()} atualizou ${photo ? 'a foto e os dados' : 'os dados'} do perfil.`,
      metadata: { athleteId: athlete.id }
    });
    return this.toProfile(updated);
  }

  async getForTrainer(trainerId: string, athleteId: string, context: Context = {}) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { id: athleteId },
      include: {
        user: true,
        personalRecords: { orderBy: { exercise: 'asc' } }
      }
    });
    if (!athlete) throw new NotFoundException('Athlete not found.');
    if (athlete.coachId !== trainerId) {
      await this.audit.record({
        event: 'ACCESS_DENIED',
        userId: trainerId,
        actorUserId: trainerId,
        affectedUserId: athlete.userId,
        result: 'FAILURE',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        description: 'Treinador tentou acessar o perfil de atleta vinculado a outro treinador.',
        metadata: { athleteId }
      });
      throw new ForbiddenException('Athlete does not belong to this trainer.');
    }
    return this.toProfile(athlete);
  }

  async listOwnPersonalRecords(userId: string) {
    const athlete = await this.findByUserId(userId);
    return this.prisma.personalRecord.findMany({
      where: { athleteId: athlete.id },
      include: { history: { orderBy: { createdAt: 'desc' }, take: 10 } },
      orderBy: { exercise: 'asc' }
    });
  }

  async upsertOwnPersonalRecord(
    userId: string,
    movement: PersonalRecordMovement,
    input: { weight: number; recordDate: string; notes?: string },
    context: Context = {}
  ) {
    const athlete = await this.findByUserId(userId);
    const record = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.personalRecord.upsert({
        where: {
          athleteId_exercise: { athleteId: athlete.id, exercise: movement }
        },
        create: {
          athleteId: athlete.id,
          exercise: movement,
          weight: input.weight,
          recordDate: new Date(input.recordDate),
          notes: input.notes?.trim() || null
        },
        update: {
          weight: input.weight,
          recordDate: new Date(input.recordDate),
          notes: input.notes?.trim() || null
        }
      });
      await transaction.personalRecordHistory.create({
        data: {
          personalRecordId: updated.id,
          athleteId: athlete.id,
          exercise: movement,
          weight: input.weight,
          recordDate: new Date(input.recordDate),
          notes: input.notes?.trim() || null
        }
      });
      return transaction.personalRecord.findUniqueOrThrow({
        where: { id: updated.id },
        include: { history: { orderBy: { createdAt: 'desc' }, take: 10 } }
      });
    });
    await this.audit.record({
      event: 'PERSONAL_RECORD_UPSERTED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      email: athlete.user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Atleta ${athlete.user.fullName} atualizou o PR de ${movement.replaceAll('_', ' ')}.`,
      metadata: { athleteId: athlete.id, movement, weight: input.weight }
    });
    return record;
  }

  private async findByUserId(userId: string) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { userId },
      include: {
        user: true,
        personalRecords: { orderBy: { exercise: 'asc' } }
      }
    });
    if (!athlete) throw new NotFoundException('Athlete profile not found.');
    return athlete;
  }

  private async updateProfile(
    athleteId: string,
    input: ProfileInput,
    profilePhoto: string | null,
    completing: boolean
  ) {
    return this.prisma.athlete.update({
      where: { id: athleteId },
      data: {
        birthDate: new Date(input.birthDate),
        sex: input.sex,
        weightCategory: input.weightCategory,
        competitiveLevel: input.competitiveLevel,
        gym: input.gym?.trim() || null,
        profilePhoto,
        profileStatus: 'PROFILE_COMPLETE',
        profileCompletedAt: completing ? new Date() : undefined,
        firstName: input.fullName.trim().split(/\s+/)[0],
        lastName: input.fullName.trim().split(/\s+/).slice(1).join(' ') || '-',
        user: { update: { fullName: input.fullName.trim() } }
      },
      include: {
        user: true,
        personalRecords: { orderBy: { exercise: 'asc' } }
      }
    });
  }

  private validateCategory(sex: AthleteSex, category: string) {
    if (!WEIGHT_CATEGORIES[sex].includes(category)) {
      throw new BadRequestException('Weight category is invalid for selected sex.');
    }
  }

  private validateBirthDate(value: string) {
    const birthDate = new Date(value);
    if (Number.isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      throw new BadRequestException('Birth date must be in the past.');
    }
  }

  private async storePhoto(file: Express.Multer.File, previousPath: string | null) {
    const detected = validateProfileImage(file);
    const uploaded = await this.storage.upload({
      buffer: file.buffer,
      fileName: file.originalname,
      contentType: detected,
      folder: 'photos'
    });
    if (previousPath) await this.storage.delete(previousPath);
    return uploaded.path;
  }

  private toProfile(athlete: {
    id: string;
    userId: string;
    coachId: string;
    profilePhoto: string | null;
    birthDate: Date | null;
    sex: AthleteSex | null;
    weightCategory: string | null;
    competitiveLevel: CompetitiveLevel | null;
    gym: string | null;
    profileStatus: 'PROFILE_INCOMPLETE' | 'PROFILE_COMPLETE';
    isActive: boolean;
    user: { fullName: string; email: string; isActive: boolean };
    personalRecords: unknown[];
  }) {
    return {
      id: athlete.id,
      userId: athlete.userId,
      trainerId: athlete.coachId,
      fullName: athlete.user.fullName,
      email: athlete.user.email,
      profilePhotoUrl: athlete.profilePhoto ? this.storage.getUrl(athlete.profilePhoto) : null,
      birthDate: athlete.birthDate,
      age: athlete.birthDate ? this.calculateAge(athlete.birthDate) : null,
      sex: athlete.sex,
      weightCategory: athlete.weightCategory,
      competitiveLevel: athlete.competitiveLevel,
      gym: athlete.gym,
      profileStatus: athlete.profileStatus,
      isActive: athlete.isActive && athlete.user.isActive,
      personalRecords: athlete.personalRecords
    };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDifference = today.getUTCMonth() - birthDate.getUTCMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getUTCDate() < birthDate.getUTCDate())
    ) {
      age -= 1;
    }
    return age;
  }
}
