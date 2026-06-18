import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AthletesService } from './application/athletes.service';
import { AthletesController } from './presentation/athletes.controller';
import { BcryptPasswordHasher } from '../auth/infrastructure/bcrypt-password-hasher';

@Module({
  imports: [AuthModule],
  controllers: [AthletesController],
  providers: [
    AthletesService,
    BcryptPasswordHasher
  ]
})
export class AthletesModule {}
