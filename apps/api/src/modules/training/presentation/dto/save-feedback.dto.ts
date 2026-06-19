import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SaveFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(10)
  pse!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  fatigue!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string;
}
