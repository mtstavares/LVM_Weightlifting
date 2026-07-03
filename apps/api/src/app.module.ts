import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AthletesModule } from './modules/athletes/athletes.module';
import { AuditModule } from './modules/audit/audit.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { MailModule } from './shared/infrastructure/mail/mail.module';
import { StorageModule } from './shared/infrastructure/storage/storage.module';
import { TrainersModule } from './modules/trainers/trainers.module';
import { TrainingModule } from './modules/training/training.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { FeedModule } from './modules/feed/feed.module';
import { CsrfOriginGuard } from './modules/auth/presentation/csrf-origin.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env']
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100
      }
    ]),
    PrismaModule,
    MailModule,
    StorageModule,
    AuthModule,
    AthletesModule,
    TrainersModule,
    ExercisesModule,
    FeedModule,
    TrainingModule,
    AuditModule,
    HealthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: CsrfOriginGuard
    }
  ]
})
export class AppModule {}
