import { Transform } from 'class-transformer';
import { AthleteSex, CompetitiveLevel } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteAthleteProfileDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsDateString()
  birthDate!: string;

  @IsEnum(AthleteSex)
  sex!: AthleteSex;

  @Transform(({ value }) => String(value))
  @IsString()
  weightCategory!: string;

  @IsEnum(CompetitiveLevel)
  competitiveLevel!: CompetitiveLevel;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  gym?: string;
}
