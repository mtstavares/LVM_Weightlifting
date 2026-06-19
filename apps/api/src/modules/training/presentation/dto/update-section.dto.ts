import { IsBoolean } from 'class-validator';

export class UpdateSectionDto {
  @IsBoolean()
  completed!: boolean;
}
