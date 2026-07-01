import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';
import { TrainingSectionType } from '@prisma/client';

export type PrescriptionMode = 'MANUAL' | 'PERCENTAGE';

class TrainingExerciseDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  exerciseKey?: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  sets!: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  reps!: number;

  @IsOptional()
  @IsIn(['MANUAL', 'PERCENTAGE'])
  mode?: PrescriptionMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  load?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  percentage?: number;
}

class TrainingSectionDto {
  @IsEnum(TrainingSectionType)
  type!: TrainingSectionType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => TrainingExerciseDto)
  exercises!: TrainingExerciseDto[];
}

export class SaveTrainingDayDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => TrainingSectionDto)
  sections!: TrainingSectionDto[];
}
