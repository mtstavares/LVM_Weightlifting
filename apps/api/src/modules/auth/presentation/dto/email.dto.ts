import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailDto {
  @ApiProperty({ example: 'coach@lvm.local' })
  @IsEmail()
  email!: string;
}
