import { Controller, ForbiddenException, Get, NotFoundException, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from '../../../modules/auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../../modules/auth/presentation/jwt-auth.guard';
import { PasswordChangeCompletedGuard } from '../../../modules/auth/presentation/password-change-completed.guard';
import { Roles } from '../../../modules/auth/presentation/roles.decorator';
import { RolesGuard } from '../../../modules/auth/presentation/roles.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard, PasswordChangeCompletedGuard, RolesGuard)
@Roles('TRAINER', 'ATHLETE')
export class PrivateMediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
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
    return response.sendFile(this.absolutePath(path));
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
    if (trainer) return response.sendFile(this.absolutePath(path));

    const athlete = await this.prisma.athlete.findFirst({
      where: { profilePhoto: path, coachId: trainerId },
      select: { id: true }
    });
    if (!athlete) throw new NotFoundException('Media not found.');
    return response.sendFile(this.absolutePath(path));
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

  private absolutePath(path: string) {
    return resolve(this.config.get<string>('LOCAL_STORAGE_ROOT', '../../storage'), path);
  }

  private assertSafeFileName(fileName: string) {
    if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i.test(fileName)) {
      throw new NotFoundException('Media not found.');
    }
  }
}
