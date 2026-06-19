import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddCoachCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}
