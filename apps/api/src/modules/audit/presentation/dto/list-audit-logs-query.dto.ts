import { AuditResult, AuthAuditEvent } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  athleteId?: string;

  @IsOptional()
  @IsEnum(AuthAuditEvent)
  event?: AuthAuditEvent;

  @IsOptional()
  @IsEnum(AuditResult)
  result?: AuditResult;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
