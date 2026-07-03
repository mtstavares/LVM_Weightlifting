import { ExerciseCategory, ExercisePrescriptionType, PersonalRecordMovement } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListExercisesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @IsOptional()
  @IsString()
  activeOnly?: string;
}

export class SaveExerciseDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(ExerciseCategory)
  category!: ExerciseCategory;

  @IsEnum(ExercisePrescriptionType)
  prescriptionType!: ExercisePrescriptionType;

  @IsOptional()
  @IsEnum(PersonalRecordMovement)
  prBase?: PersonalRecordMovement | null;

  @IsBoolean()
  canUpdatePersonalRecord!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
