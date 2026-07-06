import { Controller, ForbiddenException, Get, Inject, NotFoundException, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../../domain/file-storage.service';
import { AuthenticatedRequest } from '../../../modules/auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../../modules/auth/presentation/jwt-auth.guard';
import { PasswordChangeCompletedGuard } from '../../../modules/auth/presentation/password-change-completed.guard';
import { Roles } from '../../../modules/auth/presentation/roles.decorator';
import { RolesGuard } from '../../../modules/auth/presentation/roles.guard';
import { FILE_STORAGE_SERVICE } from './storage.token';

@Controller('storage')
@UseGuards(JwtAuthGuard, PasswordChangeCompletedGuard, RolesGuard)
@Roles('TRAINER', 'ATHLETE')
export class PrivateMediaController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE) private readonly storage: FileStorageService
  ) {}

  @Get('feed/:fileName')
  async feedMedia(
    @Req() request: AuthenticatedRequest,
    @Param('fileName') fileName: string,
    @Res() response: Response
  ) {
    this.assertSafeFileName(fileName);
    const path = `feed/${fileName}`;
    const trainerId = await this.resolveTrainerId(request);
    const post = await this.prisma.feedPost.findFirst({
      where: { mediaPath: path, deletedAt: null },
      select: { trainerId: true }
    });
    if (!post) throw new NotFoundException('Media not found.');
    if (post.trainerId !== trainerId) throw new ForbiddenException('Media does not belong to authenticated group.');
    return this.sendStoredFile(response, path);
  }

  @Get('photos/:fileName')
  async profilePhoto(
    @Req() request: AuthenticatedRequest,
    @Param('fileName') fileName: string,
    @Res() response: Response
  ) {
    this.assertSafeFileName(fileName);
    const path = `photos/${fileName}`;
    const trainerId = await this.resolveTrainerId(request);

    const trainer = await this.prisma.user.findFirst({
      where: {
        role: 'TRAINER',
        coachSettings: { profilePhoto: path },
        OR: [
          { id: trainerId },
          { coachAthletes: { some: { userId: request.user.id } } }
        ]
      },
      select: { id: true }
    });
    if (trainer) return this.sendStoredFile(response, path);

    const athlete = await this.prisma.athlete.findFirst({
      where: { profilePhoto: path, coachId: trainerId },
      select: { id: true }
    });
    if (!athlete) throw new NotFoundException('Media not found.');
    return this.sendStoredFile(response, path);
  }

  private async resolveTrainerId(request: AuthenticatedRequest) {
    if (request.user.role === 'TRAINER') return request.user.id;
    const athlete = await this.prisma.athlete.findUnique({
      where: { userId: request.user.id },
      select: { coachId: true }
    });
    if (!athlete) throw new ForbiddenException('Athlete does not have a trainer link.');
    return athlete.coachId;
  }

  private assertSafeFileName(fileName: string) {
    if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i.test(fileName)) {
      throw new NotFoundException('Media not found.');
    }
  }

  private async sendStoredFile(response: Response, path: string) {
    response.type(this.contentTypeFor(path));
    return response.send(await this.storage.read(path));
  }

  private contentTypeFor(path: string) {
    const extension = path.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm'
    };
    return contentTypes[extension ?? ''] ?? 'application/octet-stream';
  }
}
