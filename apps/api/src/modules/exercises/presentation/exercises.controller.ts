import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/presentation/roles.decorator';
import { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PasswordChangeCompletedGuard } from '../../auth/presentation/password-change-completed.guard';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { ExerciseLibraryService } from '../application/exercise-library.service';
import { ListExercisesQueryDto, SaveExerciseDto } from './dto/exercise-library.dto';

@Controller('exercises')
@UseGuards(JwtAuthGuard, PasswordChangeCompletedGuard, RolesGuard)
@Roles('TRAINER')
export class ExercisesController {
  constructor(private readonly exercises: ExerciseLibraryService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListExercisesQueryDto) {
    return this.exercises.listForTrainer(request.user.id, query);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() input: SaveExerciseDto) {
    return this.exercises.create(request.user.id, input, this.context(request));
  }

  @Patch(':exerciseId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('exerciseId') exerciseId: string,
    @Body() input: SaveExerciseDto
  ) {
    return this.exercises.update(request.user.id, exerciseId, input, this.context(request));
  }

  @Post(':exerciseId/deactivate')
  deactivate(@Req() request: AuthenticatedRequest, @Param('exerciseId') exerciseId: string) {
    return this.exercises.deactivate(request.user.id, exerciseId, this.context(request));
  }

  @Post(':exerciseId/duplicate')
  duplicate(@Req() request: AuthenticatedRequest, @Param('exerciseId') exerciseId: string) {
    return this.exercises.duplicateSystemExercise(request.user.id, exerciseId, this.context(request));
  }

  private context(request: AuthenticatedRequest) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    };
  }
}
