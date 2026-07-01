import { IsBoolean } from 'class-validator';

export class UpdateSetAttemptDto {
  @IsBoolean()
  successful!: boolean;
}
