import { IsIn, IsOptional, IsString } from 'class-validator';

export const ATHLETE_STATUSES = [
  'CONVITE_ENVIADO',
  'PRIMEIRO_LOGIN_PENDENTE',
  'ATIVO',
  'INATIVO'
] as const;

export type AthleteStatus = (typeof ATHLETE_STATUSES)[number];

export class ListAthletesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(ATHLETE_STATUSES)
  status?: AthleteStatus;
}
