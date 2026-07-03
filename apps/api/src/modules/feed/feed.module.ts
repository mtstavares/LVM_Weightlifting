import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeedService } from './application/feed.service';
import { FeedController } from './presentation/feed.controller';

@Module({
  imports: [AuthModule],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService]
})
export class FeedModule {}
