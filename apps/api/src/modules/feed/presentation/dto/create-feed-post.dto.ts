import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFeedPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  caption?: string;
}
