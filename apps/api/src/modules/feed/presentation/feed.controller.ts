import { Body, Controller, Delete, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PasswordChangeCompletedGuard } from '../../auth/presentation/password-change-completed.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { FeedService } from '../application/feed.service';
import { CreateFeedCommentDto } from './dto/create-feed-comment.dto';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';

@Controller('feed')
@UseGuards(JwtAuthGuard, PasswordChangeCompletedGuard, RolesGuard)
@Roles('TRAINER', 'ATHLETE')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.feed.list(request.user, this.context(request));
  }

  @Post('posts')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('media', {
    storage: memoryStorage(),
    limits: { fileSize: 80 * 1024 * 1024, files: 1 }
  }))
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateFeedPostDto,
    @UploadedFile() media?: Express.Multer.File
  ) {
    return this.feed.create(request.user, input.caption, media, this.context(request));
  }

  @Delete('posts/:postId')
  delete(@Req() request: AuthenticatedRequest, @Param('postId') postId: string) {
    return this.feed.delete(request.user, postId, this.context(request));
  }

  @Post('posts/:postId/comments')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  createComment(
    @Req() request: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() input: CreateFeedCommentDto
  ) {
    return this.feed.createComment(request.user, postId, input.text, this.context(request));
  }

  @Delete('posts/:postId/comments/:commentId')
  deleteComment(
    @Req() request: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string
  ) {
    return this.feed.deleteComment(request.user, postId, commentId, this.context(request));
  }

  @Post('posts/:postId/like')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  toggleLike(@Req() request: AuthenticatedRequest, @Param('postId') postId: string) {
    return this.feed.toggleLike(request.user, postId, this.context(request));
  }

  private context(request: AuthenticatedRequest) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    };
  }
}
