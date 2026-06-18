import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsService } from './application/audit-logs.service';
import { AuditLogsController } from './presentation/audit-logs.controller';

@Module({
  imports: [AuthModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService]
})
export class AuditModule {}
