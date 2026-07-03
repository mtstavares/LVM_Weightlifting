import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FeedComment, FeedPost, FeedLike, UserRole } from '@prisma/client';
import { AuditService } from '../../../shared/application/audit.service';
import { FileStorageService } from '../../../shared/domain/file-storage.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { FILE_STORAGE_SERVICE } from '../../../shared/infrastructure/storage/storage.token';
import { SafeAuthUser } from '../../auth/domain/auth.types';
import { validateFeedMedia } from './feed-media.validation';

type RequestContext = { ipAddress?: string; userAgent?: string };
const COMMENT_MAX_LENGTH = 500;

type FeedPostWithAuthor = FeedPost & {
  author: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    coachSettings: { profilePhoto: string | null } | null;
    athleteProfile: { profilePhoto: string | null; coachId: string } | null;
  };
};

type FeedCommentWithAuthor = FeedComment & {
  author: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    coachSettings: { profilePhoto: string | null } | null;
    athleteProfile: { profilePhoto: string | null; coachId: string } | null;
  };
};

type FeedPostWithInteractions = FeedPostWithAuthor & {
  comments: FeedCommentWithAuthor[];
  likes: FeedLike[];
};

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(FILE_STORAGE_SERVICE) private readonly storage: FileStorageService
  ) {}

  async list(user: SafeAuthUser, context: RequestContext = {}) {
    const trainerId = await this.resolveTrainerId(user, context);
    const posts = await this.prisma.feedPost.findMany({
      where: { trainerId, deletedAt: null },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            coachSettings: { select: { profilePhoto: true } },
            athleteProfile: { select: { profilePhoto: true, coachId: true } }
          }
        },
        comments: {
          where: { deletedAt: null },
          include: { author: this.authorSelect() },
          orderBy: { createdAt: 'asc' }
        },
        likes: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return posts.map((post) => this.present(post, user));
  }

  async create(user: SafeAuthUser, captionInput: string | undefined, file: Express.Multer.File | undefined, context: RequestContext) {
    const trainerId = await this.resolveTrainerId(user, context);
    const caption = captionInput?.trim() || null;
    if (!caption && !file) throw new BadRequestException('Informe uma legenda ou uma mídia para publicar.');

    let media: {
      mediaType: 'IMAGE' | 'VIDEO';
      mediaPath: string;
      mediaUrl: string;
      mediaMimeType: string;
      mediaSizeBytes: number;
      videoDurationSeconds?: number;
    } | undefined;

    if (file) {
      try {
        const validated = validateFeedMedia(file);
        const uploaded = await this.storage.upload({
          buffer: file.buffer,
          fileName: file.originalname,
          contentType: validated.mimeType,
          folder: 'feed'
        });
        media = {
          mediaType: validated.mediaType,
          mediaPath: uploaded.path,
          mediaUrl: uploaded.url,
          mediaMimeType: validated.mimeType,
          mediaSizeBytes: file.size,
          videoDurationSeconds: validated.durationSeconds
        };
      } catch (error) {
        await this.audit.record({
          event: error instanceof BadRequestException && `${error.message}`.includes('15 segundos') ? 'FEED_UPLOAD_VIDEO_TOO_LONG' : 'FEED_UPLOAD_INVALID_TYPE',
          userId: user.id,
          actorUserId: user.id,
          result: 'FAILURE',
          description: 'Falha ao validar upload de mídia do feed.',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: { fileName: file.originalname, mimeType: file.mimetype, size: file.size }
        });
        throw error;
      }
    }

    const post = await this.prisma.feedPost.create({
      data: {
        trainerId,
        authorUserId: user.id,
        caption,
        mediaType: media?.mediaType,
        mediaPath: media?.mediaPath,
        mediaUrl: media?.mediaUrl,
        mediaMimeType: media?.mediaMimeType,
        mediaSizeBytes: media?.mediaSizeBytes,
        videoDurationSeconds: media?.videoDurationSeconds
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            coachSettings: { select: { profilePhoto: true } },
            athleteProfile: { select: { profilePhoto: true, coachId: true } }
          }
        },
        comments: {
          where: { deletedAt: null },
          include: { author: this.authorSelect() },
          orderBy: { createdAt: 'asc' }
        },
        likes: true
      }
    });

    await this.audit.record({
      event: 'FEED_POST_CREATED',
      userId: user.id,
      actorUserId: user.id,
      affectedUserId: user.id,
      description: `${user.fullName} criou uma publicação no feed privado.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { postId: post.id, trainerId, mediaType: media?.mediaType }
    });

    return this.present(post, user);
  }

  async delete(user: SafeAuthUser, postId: string, context: RequestContext) {
    const { post, trainerId } = await this.findPostInUserGroup(user, postId, context, 'FEED_ACCESS_DENIED');

    const isAuthor = post.authorUserId === user.id;
    const isTrainer = user.role === 'TRAINER';
    if (!isAuthor && !isTrainer) {
      await this.audit.record({
        event: 'FEED_POST_DELETE_DENIED',
        userId: user.id,
        actorUserId: user.id,
        result: 'FAILURE',
        description: 'Tentativa indevida de excluir publicação do feed.',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { postId, authorUserId: post.authorUserId }
      });
      throw new ForbiddenException('Você não tem permissão para excluir esta publicação.');
    }

    const deleted = await this.prisma.feedPost.update({
      where: { id: post.id },
      data: { deletedAt: new Date(), deletedById: user.id }
    });

    await this.audit.record({
      event: isAuthor ? 'FEED_POST_DELETED_BY_AUTHOR' : 'FEED_POST_DELETED_BY_TRAINER',
      userId: user.id,
      actorUserId: user.id,
      affectedUserId: post.authorUserId,
      description: isAuthor ? `${user.fullName} excluiu a própria publicação.` : `${user.fullName} excluiu uma publicação de atleta vinculado.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { postId: post.id, trainerId }
    });

    return { id: deleted.id, deletedAt: deleted.deletedAt };
  }

  async createComment(user: SafeAuthUser, postId: string, textInput: string | undefined, context: RequestContext) {
    const text = textInput?.trim() ?? '';
    if (!text) throw new BadRequestException('Comentário não pode ficar vazio.');
    if (text.length > COMMENT_MAX_LENGTH) throw new BadRequestException(`Comentário deve ter no máximo ${COMMENT_MAX_LENGTH} caracteres.`);

    const { post, trainerId } = await this.findPostInUserGroup(user, postId, context, 'FEED_COMMENT_CREATE_DENIED');
    const comment = await this.prisma.feedComment.create({
      data: { postId: post.id, authorUserId: user.id, text },
      include: { author: this.authorSelect() }
    });

    await this.audit.record({
      event: 'FEED_COMMENT_CREATED',
      userId: user.id,
      actorUserId: user.id,
      affectedUserId: post.authorUserId,
      description: `${user.fullName} comentou em uma publicação do feed privado.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { postId: post.id, commentId: comment.id, trainerId }
    });

    return this.presentComment(comment, user);
  }

  async deleteComment(user: SafeAuthUser, postId: string, commentId: string, context: RequestContext) {
    const { post, trainerId } = await this.findPostInUserGroup(user, postId, context, 'FEED_COMMENT_DELETE_DENIED');
    const comment = await this.prisma.feedComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.postId !== post.id || comment.deletedAt) throw new NotFoundException('Comentário não encontrado.');

    const isAuthor = comment.authorUserId === user.id;
    const canModerate = user.role === 'TRAINER' && comment.authorUserId !== user.id;
    if (!isAuthor && !canModerate) {
      await this.audit.record({
        event: 'FEED_COMMENT_DELETE_DENIED',
        userId: user.id,
        actorUserId: user.id,
        affectedUserId: comment.authorUserId,
        result: 'FAILURE',
        description: 'Tentativa indevida de excluir comentário do feed.',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { postId: post.id, commentId }
      });
      throw new ForbiddenException('Você não tem permissão para excluir este comentário.');
    }

    const deleted = await this.prisma.feedComment.update({
      where: { id: comment.id },
      data: { deletedAt: new Date(), deletedById: user.id }
    });

    await this.audit.record({
      event: isAuthor ? 'FEED_COMMENT_DELETED_BY_AUTHOR' : 'FEED_COMMENT_DELETED_BY_TRAINER',
      userId: user.id,
      actorUserId: user.id,
      affectedUserId: comment.authorUserId,
      description: isAuthor ? `${user.fullName} excluiu o próprio comentário.` : `${user.fullName} moderou um comentário de atleta vinculado.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { postId: post.id, commentId: comment.id, trainerId }
    });

    return { id: deleted.id, deletedAt: deleted.deletedAt };
  }

  async toggleLike(user: SafeAuthUser, postId: string, context: RequestContext) {
    const { post, trainerId } = await this.findPostInUserGroup(user, postId, context, 'FEED_LIKE_DENIED');
    const existing = await this.prisma.feedLike.findUnique({
      where: { postId_userId: { postId: post.id, userId: user.id } }
    });

    if (existing) {
      await this.prisma.feedLike.delete({ where: { id: existing.id } });
      await this.audit.record({
        event: 'FEED_LIKE_REMOVED',
        userId: user.id,
        actorUserId: user.id,
        affectedUserId: post.authorUserId,
        description: `${user.fullName} removeu uma curtida no feed privado.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { postId: post.id, trainerId }
      });
    } else {
      await this.prisma.feedLike.create({ data: { postId: post.id, userId: user.id } });
      await this.audit.record({
        event: 'FEED_LIKE_CREATED',
        userId: user.id,
        actorUserId: user.id,
        affectedUserId: post.authorUserId,
        description: `${user.fullName} curtiu uma publicação do feed privado.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { postId: post.id, trainerId }
      });
    }

    const likesCount = await this.prisma.feedLike.count({ where: { postId: post.id } });
    return { likedByMe: !existing, likesCount };
  }

  private async resolveTrainerId(user: SafeAuthUser, context: RequestContext) {
    if (user.role === 'TRAINER') return user.id;
    const athlete = await this.prisma.athlete.findUnique({ where: { userId: user.id } });
    if (!athlete) {
      await this.audit.record({
        event: 'FEED_ACCESS_DENIED',
        userId: user.id,
        actorUserId: user.id,
        result: 'FAILURE',
        description: 'Tentativa de acessar feed sem vínculo de treinador.',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      throw new ForbiddenException('Atleta sem v?nculo com treinador.');
    }
    return athlete.coachId;
  }

  private async findPostInUserGroup(
    user: SafeAuthUser,
    postId: string,
    context: RequestContext,
    deniedEvent: 'FEED_ACCESS_DENIED' | 'FEED_COMMENT_CREATE_DENIED' | 'FEED_COMMENT_DELETE_DENIED' | 'FEED_LIKE_DENIED'
  ) {
    const trainerId = await this.resolveTrainerId(user, context);
    const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Publicação não encontrada.');

    if (post.trainerId !== trainerId) {
      await this.audit.record({
        event: deniedEvent,
        userId: user.id,
        actorUserId: user.id,
        affectedUserId: post.authorUserId,
        result: 'FAILURE',
        description: 'Tentativa de interagir com publicação de outro grupo.',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { postId, trainerId, postTrainerId: post.trainerId }
      });
      throw new ForbiddenException('Você não tem permissão para acessar esta publicação.');
    }

    return { post, trainerId };
  }

  private authorSelect() {
    return {
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        coachSettings: { select: { profilePhoto: true } },
        athleteProfile: { select: { profilePhoto: true, coachId: true } }
      }
    };
  }

  private present(post: FeedPostWithInteractions, currentUser: SafeAuthUser) {
    const photo = post.author.role === 'TRAINER'
      ? post.author.coachSettings?.profilePhoto
      : post.author.athleteProfile?.profilePhoto;
    const photoUrl = photo ? this.storage.getUrl(photo) : null;
    return {
      id: post.id,
      caption: post.caption,
      mediaType: post.mediaType,
      mediaUrl: post.mediaPath ? this.storage.getUrl(post.mediaPath) : post.mediaUrl,
      mediaMimeType: post.mediaMimeType,
      videoDurationSeconds: post.videoDurationSeconds,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        name: post.author.fullName,
        email: post.author.email,
        role: post.author.role,
        photoUrl
      },
      canDelete: currentUser.role === 'TRAINER' || post.authorUserId === currentUser.id,
      likesCount: post.likes.length,
      likedByMe: post.likes.some((like) => like.userId === currentUser.id),
      commentsCount: post.comments.length,
      comments: post.comments.map((comment) => this.presentComment(comment, currentUser))
    };
  }

  private presentComment(comment: FeedCommentWithAuthor, currentUser: SafeAuthUser) {
    const photo = comment.author.role === 'TRAINER'
      ? comment.author.coachSettings?.profilePhoto
      : comment.author.athleteProfile?.profilePhoto;
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        name: comment.author.fullName,
        email: comment.author.email,
        role: comment.author.role,
        photoUrl: photo ? this.storage.getUrl(photo) : null
      },
      canDelete: currentUser.role === 'TRAINER' || comment.authorUserId === currentUser.id
    };
  }
}
