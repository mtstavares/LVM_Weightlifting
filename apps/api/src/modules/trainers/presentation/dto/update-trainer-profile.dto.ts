import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTrainerProfileDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  gym?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
