import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PersonalRecordMovement } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AthletesService } from '../application/athletes.service';
import { AthleteProfileService } from '../application/athlete-profile.service';
import { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { PasswordChangeCompletedGuard } from '../../auth/presentation/password-change-completed.guard';
import { ProfileCompletedGuard } from '../../auth/presentation/profile-completed.guard';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';
import { ListAthletesQueryDto } from './dto/list-athletes-query.dto';
import { DeactivateAthleteDto } from './dto/deactivate-athlete.dto';
import { CompleteAthleteProfileDto } from './dto/complete-athlete-profile.dto';
import { UpsertPersonalRecordDto } from './dto/upsert-personal-record.dto';

@ApiTags('Athletes')
@Controller('athletes')
@UseGuards(JwtAuthGuard, PasswordChangeCompletedGuard, RolesGuard)
export class AthletesController {
  constructor(
    private readonly athletes: AthletesService,
    private readonly profiles: AthleteProfileService
  ) {}

  @Post()
  @Roles('TRAINER')
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateAthleteDto) {
    return this.athletes.create(request.user.id, input.fullName, input.email, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }

  @Get()
  @Roles('TRAINER')
  list(@Req() request: AuthenticatedRequest, @Query() query: ListAthletesQueryDto) {
    return this.athletes.listForTrainer(request.user.id, query);
  }

  @Get('me')
  @Roles('ATHLETE')
  @UseGuards(ProfileCompletedGuard)
  ownProfile(@Req() request: AuthenticatedRequest) {
    return this.athletes.getOwnProfile(request.user.id);
  }

  @Get('me/profile')
  @Roles('ATHLETE')
  getOwnProfile(@Req() request: AuthenticatedRequest) {
    return this.profiles.getOwn(request.user.id);
  }

  @Put('me/profile/complete')
  @Roles('ATHLETE')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 }
    })
  )
  completeOwnProfile(
    @Req() request: AuthenticatedRequest,
    @Body() input: CompleteAthleteProfileDto,
    @UploadedFile() photo?: Express.Multer.File
  ) {
    return this.profiles.completeOwn(request.user.id, input, photo, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }

  @Patch('me/profile')
  @Roles('ATHLETE')
  @UseGuards(ProfileCompletedGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 }
    })
  )
  updateOwnProfile(
    @Req() request: AuthenticatedRequest,
    @Body() input: CompleteAthleteProfileDto,
    @UploadedFile() photo?: Express.Multer.File
  ) {
    return this.profiles.updateOwn(request.user.id, input, photo, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }

  @Get('me/personal-records')
  @Roles('ATHLETE')
  @UseGuards(ProfileCompletedGuard)
  listOwnPersonalRecords(@Req() request: AuthenticatedRequest) {
    return this.profiles.listOwnPersonalRecords(request.user.id);
  }

  @Put('me/personal-records/:movement')
  @Roles('ATHLETE')
  @UseGuards(ProfileCompletedGuard)
  upsertOwnPersonalRecord(
    @Req() request: AuthenticatedRequest,
    @Param('movement', new ParseEnumPipe(PersonalRecordMovement))
    movement: PersonalRecordMovement,
    @Body() input: UpsertPersonalRecordDto
  ) {
    return this.profiles.upsertOwnPersonalRecord(request.user.id, movement, input, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }

  @Get(':athleteId/profile')
  @Roles('TRAINER')
  getProfile(
    @Req() request: AuthenticatedRequest,
    @Param('athleteId') athleteId: string
  ) {
    return this.profiles.getForTrainer(request.user.id, athleteId, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }

  @Get(':athleteId')
  @Roles('TRAINER')
  get(@Req() request: AuthenticatedRequest, @Param('athleteId') athleteId: string) {
    return this.athletes.getForTrainer(request.user.id, athleteId);
  }

  @Patch(':athleteId')
  @Roles('TRAINER')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Body() input: UpdateAthleteDto
  ) {
    return this.athletes.updateForTrainer(request.user.id, athleteId, input, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }

  @Post(':athleteId/deactivate')
  @Roles('TRAINER')
  deactivate(
    @Req() request: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Body() input: DeactivateAthleteDto
  ) {
    return this.athletes.deactivate(request.user.id, athleteId, input.reason, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }

  @Post(':athleteId/reactivate')
  @Roles('TRAINER')
  reactivate(@Req() request: AuthenticatedRequest, @Param('athleteId') athleteId: string) {
    return this.athletes.reactivate(request.user.id, athleteId, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }

  @Post(':athleteId/resend-invitation')
  @HttpCode(204)
  @Roles('TRAINER')
  resendInvitation(
    @Req() request: AuthenticatedRequest,
    @Param('athleteId') athleteId: string
  ) {
    return this.athletes.resendInvitation(request.user.id, athleteId, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    });
  }
}
