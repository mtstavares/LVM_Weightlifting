import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterCoachDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(3)
  fullName!: string;

  @ApiProperty({ example: 'maria@exemplo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SenhaForte123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'Password must contain uppercase, lowercase, number and special character.'
  })
  password!: string;

  @ApiProperty({ example: 'SenhaForte123!' })
  @IsString()
  passwordConfirmation!: string;
}
