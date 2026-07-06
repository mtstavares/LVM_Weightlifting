import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrivateMediaController } from './private-media.controller';

describe('PrivateMediaController', () => {
  let prisma: any;
  let controller: PrivateMediaController;
  const response = {
    type: jest.fn(),
    send: jest.fn((body: Buffer) => body)
  };
  const storage = { read: jest.fn() };
  const trainerRequest = { user: { id: 'trainer-1', role: 'TRAINER' } };
  const athleteRequest = { user: { id: 'athlete-user-1', role: 'ATHLETE' } };

  beforeEach(() => {
    prisma = {
      feedPost: { findFirst: jest.fn() },
      athlete: { findUnique: jest.fn(), findFirst: jest.fn() },
      user: { findFirst: jest.fn() }
    };
    response.type.mockClear();
    response.send.mockClear();
    storage.read.mockResolvedValue(Buffer.from('media'));
    controller = new PrivateMediaController(prisma, storage as any);
  });

  it('serves feed media only for the authenticated trainer group', async () => {
    prisma.feedPost.findFirst.mockResolvedValue({ trainerId: 'trainer-1' });

    await controller.feedMedia(trainerRequest as any, '11111111-1111-4111-8111-111111111111.jpg', response as any);

    expect(response.type).toHaveBeenCalledWith('image/jpeg');
    expect(response.send).toHaveBeenCalled();
  });

  it('blocks feed media from another trainer group', async () => {
    prisma.feedPost.findFirst.mockResolvedValue({ trainerId: 'trainer-2' });

    await expect(controller.feedMedia(trainerRequest as any, '11111111-1111-4111-8111-111111111111.jpg', response as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks unsafe media file names', async () => {
    await expect(controller.feedMedia(trainerRequest as any, '..%2Fsecret.jpg', response as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows athlete to access feed media from own trainer group', async () => {
    prisma.athlete.findUnique.mockResolvedValue({ coachId: 'trainer-1' });
    prisma.feedPost.findFirst.mockResolvedValue({ trainerId: 'trainer-1' });

    await controller.feedMedia(athleteRequest as any, '11111111-1111-4111-8111-111111111111.mp4', response as any);

    expect(response.type).toHaveBeenCalledWith('video/mp4');
    expect(response.send).toHaveBeenCalled();
  });

  it('allows trainer to access linked athlete profile photo', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.athlete.findFirst.mockResolvedValue({ id: 'athlete-1' });

    await controller.profilePhoto(trainerRequest as any, '11111111-1111-4111-8111-111111111111.webp', response as any);

    expect(response.type).toHaveBeenCalledWith('image/webp');
    expect(response.send).toHaveBeenCalled();
  });
});
