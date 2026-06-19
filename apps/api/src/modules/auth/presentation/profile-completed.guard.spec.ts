import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ProfileCompletedGuard } from './profile-completed.guard';

function context(role: 'TRAINER' | 'ATHLETE') {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 'user-1',
          fullName: 'User',
          email: 'user@lvm.local',
          role,
          emailVerified: true,
          mustChangePassword: false,
          profileComplete: false
        }
      })
    })
  } as unknown as ExecutionContext;
}

describe('ProfileCompletedGuard', () => {
  const prisma = {
    athlete: { findUnique: jest.fn() }
  } as unknown as PrismaService;
  const guard = new ProfileCompletedGuard(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('allows trainers and athletes with complete profiles', async () => {
    await expect(guard.canActivate(context('TRAINER'))).resolves.toBe(true);
    (prisma.athlete.findUnique as jest.Mock).mockResolvedValue({
      profileStatus: 'PROFILE_COMPLETE'
    });
    await expect(guard.canActivate(context('ATHLETE'))).resolves.toBe(true);
  });

  it('blocks athletes with incomplete or missing profiles', async () => {
    (prisma.athlete.findUnique as jest.Mock).mockResolvedValue({
      profileStatus: 'PROFILE_INCOMPLETE'
    });
    await expect(guard.canActivate(context('ATHLETE'))).rejects.toBeInstanceOf(
      ForbiddenException
    );
    (prisma.athlete.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(guard.canActivate(context('ATHLETE'))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
