import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrainerProfileService } from './application/trainer-profile.service';
import { TrainersController } from './presentation/trainers.controller';

@Module({
  imports: [AuthModule],
  controllers: [TrainersController],
  providers: [TrainerProfileService]
})
export class TrainersModule {}
