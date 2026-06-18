import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateAthleteDto {
  @ApiProperty({ example: 'Joao da Silva' })
  @IsString()
  @MinLength(3)
  fullName!: string;

  @ApiProperty({ example: 'joao@exemplo.com' })
  @IsEmail()
  email!: string;
}
