import { ForbiddenException } from '@nestjs/common';
import { FeedService } from './feed.service';

describe('FeedService', () => {
  let prisma: any;
  let audit: { record: jest.Mock };
  let storage: { upload: jest.Mock; getUrl: jest.Mock; delete: jest.Mock };
  let service: FeedService;

  const trainer = { id: 'trainer-1', fullName: 'Treinador', email: 't@test.local', role: 'TRAINER' as const, emailVerified: true, mustChangePassword: false, profileComplete: true };
  const athlete = { id: 'athlete-user-1', fullName: 'Atleta Um', email: 'a@test.local', role: 'ATHLETE' as const, emailVerified: true, mustChangePassword: false, profileComplete: true };
  const post = {
    id: 'post-1',
    trainerId: 'trainer-1',
    authorUserId: 'athlete-user-1',
    caption: 'Bom treino',
    mediaType: null,
    mediaPath: null,
    mediaUrl: null,
    mediaMimeType: null,
    mediaSizeBytes: null,
    videoDurationSeconds: null,
    deletedAt: null,
    deletedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'athlete-user-1',
      fullName: 'Atleta Um',
      email: 'a@test.local',
      role: 'ATHLETE',
      coachSettings: null,
      athleteProfile: { profilePhoto: 'photos/athlete.jpg', coachId: 'trainer-1' }
    },
    comments: [],
    likes: []
  };
  const comment = {
    id: 'comment-1',
    postId: 'post-1',
    authorUserId: 'athlete-user-1',
    text: 'Boa sessão',
    deletedAt: null,
    deletedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: post.author
  };

  beforeEach(() => {
    prisma = {
      athlete: { findUnique: jest.fn() },
      feedPost: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      feedComment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      feedLike: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
      }
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    storage = { upload: jest.fn(), getUrl: jest.fn((path: string) => `/storage/${path}`), delete: jest.fn() };
    service = new FeedService(prisma, audit as any, storage as any);
  });

  it('trainer lists posts from own group', async () => {
    prisma.feedPost.findMany.mockResolvedValue([post]);

    const result = await service.list(trainer, {});

    expect(prisma.feedPost.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { trainerId: 'trainer-1', deletedAt: null } }));
    expect(result[0]).toMatchObject({ id: 'post-1', canDelete: true, author: { photoUrl: '/storage/photos/athlete.jpg' } });
  });

  it('athlete lists posts from linked trainer group', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ coachId: 'trainer-1' });
    prisma.feedPost.findMany.mockResolvedValue([post]);

    await service.list(athlete, {});

    expect(prisma.feedPost.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { trainerId: 'trainer-1', deletedAt: null } }));
  });

  it('creates text-only post', async () => {
    prisma.feedPost.create.mockResolvedValue({
      ...post,
      caption: 'Mensagem',
      authorUserId: 'trainer-1',
      author: { ...post.author, id: 'trainer-1', role: 'TRAINER', coachSettings: { profilePhoto: null }, athleteProfile: null }
    });

    const result = await service.create(trainer, 'Mensagem', undefined, {});

    expect(prisma.feedPost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ trainerId: 'trainer-1', authorUserId: 'trainer-1', caption: 'Mensagem' }) }));
    expect(result.caption).toBe('Mensagem');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_POST_CREATED' }));
  });

  it('creates image post with uploaded media', async () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff]);
    storage.upload.mockResolvedValue({ path: 'feed/image.jpg', url: '/storage/feed/image.jpg' });
    prisma.feedPost.create.mockResolvedValue({
      ...post,
      mediaType: 'IMAGE',
      mediaPath: 'feed/image.jpg',
      mediaUrl: '/storage/feed/image.jpg'
    });

    const result = await service.create(trainer, 'Foto', {
      originalname: 'foto.jpg',
      mimetype: 'image/jpeg',
      size: buffer.length,
      buffer
    } as Express.Multer.File, {});

    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ folder: 'feed', contentType: 'image/jpeg' }));
    expect(result.mediaUrl).toBe('/storage/feed/image.jpg');
  });

  it('rejects empty post', async () => {
    await expect(service.create(trainer, ' ', undefined, {})).rejects.toThrow('Informe uma legenda ou uma mídia para publicar.');
  });

  it('audits invalid upload', async () => {
    await expect(service.create(trainer, 'Arquivo', {
      originalname: 'arquivo.svg',
      mimetype: 'image/svg+xml',
      size: 10,
      buffer: Buffer.from('<svg />')
    } as Express.Multer.File, {})).rejects.toThrow();

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_UPLOAD_INVALID_TYPE', result: 'FAILURE' }));
  });

  it('rejects athlete without trainer link', async () => {
    prisma.athlete.findUnique.mockResolvedValue(null);

    await expect(service.list(athlete, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_ACCESS_DENIED' }));
  });

  it('trainer deletes linked athlete post', async () => {
    prisma.feedPost.findUnique.mockResolvedValue(post);
    prisma.feedPost.update.mockResolvedValue({ ...post, deletedAt: new Date() });

    await service.delete(trainer, 'post-1', {});

    expect(prisma.feedPost.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deletedById: 'trainer-1' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_POST_DELETED_BY_TRAINER' }));
  });

  it('athlete deletes own post', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ coachId: 'trainer-1' });
    prisma.feedPost.findUnique.mockResolvedValue(post);
    prisma.feedPost.update.mockResolvedValue({ ...post, deletedAt: new Date() });

    await service.delete(athlete, 'post-1', {});

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_POST_DELETED_BY_AUTHOR' }));
  });

  it('athlete cannot delete trainer post', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ coachId: 'trainer-1' });
    prisma.feedPost.findUnique.mockResolvedValue({ ...post, authorUserId: 'trainer-1' });

    await expect(service.delete(athlete, 'post-1', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_POST_DELETE_DENIED' }));
  });

  it('trainer cannot delete post from another group', async () => {
    prisma.feedPost.findUnique.mockResolvedValue({ ...post, trainerId: 'trainer-2' });

    await expect(service.delete(trainer, 'post-1', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_ACCESS_DENIED' }));
  });

  it('trainer comments in linked athlete post', async () => {
    prisma.feedPost.findUnique.mockResolvedValue(post);
    prisma.feedComment.create.mockResolvedValue({ ...comment, text: 'Boa execução', authorUserId: 'trainer-1', author: { ...post.author, id: 'trainer-1', role: 'TRAINER', coachSettings: { profilePhoto: null }, athleteProfile: null } });

    const result = await service.createComment(trainer, 'post-1', 'Boa execução', {});

    expect(prisma.feedComment.create).toHaveBeenCalledWith(expect.objectContaining({ data: { postId: 'post-1', authorUserId: 'trainer-1', text: 'Boa execução' } }));
    expect(result).toMatchObject({ text: 'Boa execução', canDelete: true });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_COMMENT_CREATED' }));
  });

  it('athlete comments in same group post', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ coachId: 'trainer-1' });
    prisma.feedPost.findUnique.mockResolvedValue({ ...post, authorUserId: 'trainer-1' });
    prisma.feedComment.create.mockResolvedValue(comment);

    await service.createComment(athlete, 'post-1', 'Fechado', {});

    expect(prisma.feedComment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ authorUserId: 'athlete-user-1' }) }));
  });

  it('rejects empty comment', async () => {
    await expect(service.createComment(trainer, 'post-1', ' ', {})).rejects.toThrow('Comentário não pode ficar vazio.');
  });

  it('blocks comment in another group', async () => {
    prisma.feedPost.findUnique.mockResolvedValue({ ...post, trainerId: 'trainer-2' });

    await expect(service.createComment(trainer, 'post-1', 'Inválido', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_COMMENT_CREATE_DENIED' }));
  });

  it('author deletes own comment', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ coachId: 'trainer-1' });
    prisma.feedPost.findUnique.mockResolvedValue(post);
    prisma.feedComment.findUnique.mockResolvedValue(comment);
    prisma.feedComment.update.mockResolvedValue({ ...comment, deletedAt: new Date() });

    await service.deleteComment(athlete, 'post-1', 'comment-1', {});

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_COMMENT_DELETED_BY_AUTHOR' }));
  });

  it('trainer deletes athlete comment', async () => {
    prisma.feedPost.findUnique.mockResolvedValue(post);
    prisma.feedComment.findUnique.mockResolvedValue(comment);
    prisma.feedComment.update.mockResolvedValue({ ...comment, deletedAt: new Date() });

    await service.deleteComment(trainer, 'post-1', 'comment-1', {});

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_COMMENT_DELETED_BY_TRAINER' }));
  });

  it('athlete cannot delete another user comment', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ coachId: 'trainer-1' });
    prisma.feedPost.findUnique.mockResolvedValue(post);
    prisma.feedComment.findUnique.mockResolvedValue({ ...comment, authorUserId: 'trainer-1' });

    await expect(service.deleteComment(athlete, 'post-1', 'comment-1', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_COMMENT_DELETE_DENIED' }));
  });

  it('creates and removes like as toggle', async () => {
    prisma.feedPost.findUnique.mockResolvedValue(post);
    prisma.feedLike.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'like-1', postId: 'post-1', userId: 'trainer-1' });
    prisma.feedLike.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(service.toggleLike(trainer, 'post-1', {})).resolves.toEqual({ likedByMe: true, likesCount: 1 });
    await expect(service.toggleLike(trainer, 'post-1', {})).resolves.toEqual({ likedByMe: false, likesCount: 0 });

    expect(prisma.feedLike.create).toHaveBeenCalledWith({ data: { postId: 'post-1', userId: 'trainer-1' } });
    expect(prisma.feedLike.delete).toHaveBeenCalledWith({ where: { id: 'like-1' } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_LIKE_CREATED' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_LIKE_REMOVED' }));
  });

  it('blocks like in another group', async () => {
    prisma.feedPost.findUnique.mockResolvedValue({ ...post, trainerId: 'trainer-2' });

    await expect(service.toggleLike(trainer, 'post-1', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEED_LIKE_DENIED' }));
  });
});
