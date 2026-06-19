import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PasswordChangeCompletedGuard } from '../../auth/presentation/password-change-completed.guard';
import { ProfileCompletedGuard } from '../../auth/presentation/profile-completed.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { TrainingService } from '../application/training.service';
import { AddCoachCommentDto } from './dto/add-coach-comment.dto';
import { SaveFeedbackDto } from './dto/save-feedback.dto';
import { SaveTrainingDayDto } from './dto/save-training-day.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@ApiTags('Training')
@Controller('training')
@UseGuards(
  JwtAuthGuard,
  PasswordChangeCompletedGuard,
  ProfileCompletedGuard,
  RolesGuard
)
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get('trainer/athletes/:athleteId/calendar')
  @Roles('TRAINER')
  trainerCalendar(
    @Req() request: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Query('month') month: string
  ) {
    return this.training.trainerCalendar(request.user.id, athleteId, month, this.context(request));
  }

  @Get('trainer/athletes/:athleteId/days/:date')
  @Roles('TRAINER')
  trainerDay(
    @Req() request: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Param('date') date: string
  ) {
    return this.training.trainerDay(request.user.id, athleteId, date, this.context(request));
  }

  @Put('trainer/athletes/:athleteId/days/:date')
  @Roles('TRAINER')
  saveDay(
    @Req() request: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Param('date') date: string,
    @Body() input: SaveTrainingDayDto
  ) {
    return this.training.saveDay(
      { id: request.user.id, fullName: request.user.fullName },
      athleteId,
      date,
      input,
      this.context(request)
    );
  }

  @Delete('trainer/athletes/:athleteId/days/:date')
  @HttpCode(204)
  @Roles('TRAINER')
  deleteDay(
    @Req() request: AuthenticatedRequest,
    @Param('athleteId') athleteId: string,
    @Param('date') date: string
  ) {
    return this.training.deleteDay(
      { id: request.user.id, fullName: request.user.fullName },
      athleteId,
      date,
      this.context(request)
    );
  }

  @Post('trainer/days/:trainingDayId/comments')
  @Roles('TRAINER')
  addComment(
    @Req() request: AuthenticatedRequest,
    @Param('trainingDayId') trainingDayId: string,
    @Body() input: AddCoachCommentDto
  ) {
    return this.training.addCoachComment(
      { id: request.user.id, fullName: request.user.fullName },
      trainingDayId,
      input.comment,
      this.context(request)
    );
  }

  @Get('athlete/calendar')
  @Roles('ATHLETE')
  athleteCalendar(@Req() request: AuthenticatedRequest, @Query('month') month: string) {
    return this.training.athleteCalendar(request.user.id, month);
  }

  @Get('athlete/days/:date')
  @Roles('ATHLETE')
  athleteDay(@Req() request: AuthenticatedRequest, @Param('date') date: string) {
    return this.training.athleteDay(request.user.id, date);
  }

  @Post('athlete/days/:trainingDayId/start')
  @Roles('ATHLETE')
  startDay(
    @Req() request: AuthenticatedRequest,
    @Param('trainingDayId') trainingDayId: string
  ) {
    return this.training.startDay(request.user.id, trainingDayId, this.context(request));
  }

  @Patch('athlete/days/:trainingDayId/sections/:sectionId')
  @Roles('ATHLETE')
  updateSection(
    @Req() request: AuthenticatedRequest,
    @Param('trainingDayId') trainingDayId: string,
    @Param('sectionId') sectionId: string,
    @Body() input: UpdateSectionDto
  ) {
    return this.training.updateSection(
      request.user.id,
      trainingDayId,
      sectionId,
      input.completed
    );
  }

  @Post('athlete/days/:trainingDayId/complete')
  @Roles('ATHLETE')
  completeDay(
    @Req() request: AuthenticatedRequest,
    @Param('trainingDayId') trainingDayId: string
  ) {
    return this.training.completeDay(request.user.id, trainingDayId, this.context(request));
  }

  @Put('athlete/days/:trainingDayId/feedback')
  @Roles('ATHLETE')
  saveFeedback(
    @Req() request: AuthenticatedRequest,
    @Param('trainingDayId') trainingDayId: string,
    @Body() input: SaveFeedbackDto
  ) {
    return this.training.saveFeedback(
      request.user.id,
      trainingDayId,
      input,
      this.context(request)
    );
  }

  private context(request: AuthenticatedRequest) {
    return { ipAddress: request.ip, userAgent: request.get('user-agent') };
  }
}
