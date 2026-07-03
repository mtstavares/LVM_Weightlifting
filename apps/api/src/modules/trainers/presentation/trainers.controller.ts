import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { TrainerProfileService } from '../application/trainer-profile.service';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PasswordChangeCompletedGuard } from '../../auth/presentation/password-change-completed.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';

@ApiTags('Trainers')
@Controller('trainers')
@UseGuards(JwtAuthGuard, PasswordChangeCompletedGuard, RolesGuard)
@Roles('TRAINER')
export class TrainersController {
  constructor(private readonly profiles: TrainerProfileService) {}

  @Get('me/profile')
  getOwnProfile(@Req() request: AuthenticatedRequest) {
    return this.profiles.getOwn(request.user.id);
  }

  @Get('me/feed')
  getOwnFeed(@Req() request: AuthenticatedRequest) {
    return {
      trainerId: request.user.id,
      publications: []
    };
  }

  @Patch('me/profile')
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 }
    })
  )
  updateOwnProfile(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateTrainerProfileDto,
    @UploadedFile() photo?: Express.Multer.File
  ) {
    return this.profiles.updateOwn(request.user.id, input, photo, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }
}
