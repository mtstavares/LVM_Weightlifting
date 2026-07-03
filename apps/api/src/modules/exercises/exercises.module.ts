import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExerciseLibraryService } from './application/exercise-library.service';
import { ExercisesController } from './presentation/exercises.controller';

@Module({
  imports: [AuthModule],
  controllers: [ExercisesController],
  providers: [ExerciseLibraryService],
  exports: [ExerciseLibraryService]
})
export class ExercisesModule {}
