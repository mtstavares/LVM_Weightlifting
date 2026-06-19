import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../shared/application/audit.service';
import { FileStorageService } from '../../../shared/domain/file-storage.service';
import { validateProfileImage } from '../../../shared/domain/image-file';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { FILE_STORAGE_SERVICE } from '../../../shared/infrastructure/storage/storage.token';

type Context = { ipAddress?: string; userAgent?: string };

@Injectable()
export class TrainerProfileService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE) private readonly storage: FileStorageService,
    private readonly audit: AuditService
  ) {}

  async getOwn(userId: string) {
    return this.toResponse(await this.findTrainer(userId));
  }

  async updateOwn(
    userId: string,
    input: { fullName: string; birthDate?: string; gym?: string; bio?: string },
    photo?: Express.Multer.File,
    context: Context = {}
  ) {
    const current = await this.findTrainer(userId);
    if (input.birthDate) this.validateBirthDate(input.birthDate);
    const profilePhoto = photo
      ? await this.storePhoto(photo, current.coachSettings?.profilePhoto ?? null)
      : current.coachSettings?.profilePhoto;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName.trim(),
        coachSettings: {
          upsert: {
            create: {
              profilePhoto,
              birthDate: input.birthDate ? new Date(input.birthDate) : null,
              gym: input.gym?.trim() || null,
              bio: input.bio?.trim() || null
            },
            update: {
              profilePhoto,
              birthDate: input.birthDate ? new Date(input.birthDate) : null,
              gym: input.gym?.trim() || null,
              bio: input.bio?.trim() || null
            }
          }
        }
      },
      include: { coachSettings: true }
    });

    await this.audit.record({
      event: photo ? 'TRAINER_PHOTO_UPDATED' : 'TRAINER_PROFILE_UPDATED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      email: updated.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: `Treinador ${updated.fullName} atualizou o próprio perfil.`,
      metadata: { changedPhoto: Boolean(photo) }
    });
    return this.toResponse(updated);
  }

  private async findTrainer(userId: string) {
    const trainer = await this.prisma.user.findFirst({
      where: { id: userId, role: 'TRAINER', isActive: true },
      include: { coachSettings: true }
    });
    if (!trainer) throw new NotFoundException('Trainer profile not found.');
    return trainer;
  }

  private async storePhoto(file: Express.Multer.File, previousPath: string | null) {
    const contentType = validateProfileImage(file);
    const uploaded = await this.storage.upload({
      buffer: file.buffer,
      fileName: file.originalname,
      contentType,
      folder: 'photos'
    });
    if (previousPath) await this.storage.delete(previousPath);
    return uploaded.path;
  }

  private validateBirthDate(value: string) {
    const birthDate = new Date(value);
    if (Number.isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      throw new BadRequestException('Birth date must be in the past.');
    }
  }

  private toResponse(trainer: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    coachSettings: {
      profilePhoto: string | null;
      birthDate: Date | null;
      gym: string | null;
      bio: string | null;
    } | null;
  }) {
    const birthDate = trainer.coachSettings?.birthDate ?? null;
    return {
      id: trainer.id,
      fullName: trainer.fullName,
      email: trainer.email,
      isActive: trainer.isActive,
      profilePhotoUrl: trainer.coachSettings?.profilePhoto
        ? this.storage.getUrl(trainer.coachSettings.profilePhoto)
        : null,
      birthDate,
      age: birthDate ? this.calculateAge(birthDate) : null,
      gym: trainer.coachSettings?.gym ?? null,
      bio: trainer.coachSettings?.bio ?? null
    };
  }

  private calculateAge(birthDate: Date) {
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
