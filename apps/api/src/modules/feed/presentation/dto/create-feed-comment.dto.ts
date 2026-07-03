import { IsString, MaxLength } from 'class-validator';

export class CreateFeedCommentDto {
  @IsString()
  @MaxLength(500)
  text!: string;
}
