import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AthletesService } from '../application/athletes.service';
import { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { PasswordChangeCompletedGuard } from '../../auth/presentation/password-change-completed.guard';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';
import { ListAthletesQueryDto } from './dto/list-athletes-query.dto';
import { DeactivateAthleteDto } from './dto/deactivate-athlete.dto';

@ApiTags('Athletes')
@Controller('athletes')
@UseGuards(JwtAuthGuard, PasswordChangeCompletedGuard, RolesGuard)
export class AthletesController {
  constructor(private readonly athletes: AthletesService) {}

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
  ownProfile(@Req() request: AuthenticatedRequest) {
    return this.athletes.getOwnProfile(request.user.id);
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
