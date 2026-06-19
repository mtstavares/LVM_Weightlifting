import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertPersonalRecordDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(1000)
  weight!: number;

  @IsDateString()
  recordDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
