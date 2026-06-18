import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from '../application/audit-logs.service';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PasswordChangeCompletedGuard } from '../../auth/presentation/password-change-completed.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PasswordChangeCompletedGuard, RolesGuard)
@Roles('TRAINER')
export class AuditLogsController {
  constructor(private readonly logs: AuditLogsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListAuditLogsQueryDto) {
    return this.logs.listForTrainer(request.user.id, query);
  }
}
