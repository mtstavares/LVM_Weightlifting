import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../domain/token-service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const tokens: jest.Mocked<TokenService> = {
    issue: jest.fn(),
    verifyAccess: jest.fn(),
    verifyRefresh: jest.fn(),
    hash: jest.fn()
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) }
  } as unknown as PrismaService;
  const guard = new JwtAuthGuard(tokens, prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isActive: true });
  });

  it('authenticates using an access cookie', async () => {
    const request = { headers: {}, cookies: { access_token: 'cookie-token' } };
    tokens.verifyAccess.mockResolvedValue({
      sub: 'user-1',
      fullName: 'Maria Silva',
      email: 'coach@lvm.local',
      role: 'TRAINER',
      emailVerified: true,
      mustChangePassword: false,
      profileComplete: true,
      type: 'access'
    });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user', {
      id: 'user-1',
      fullName: 'Maria Silva',
      email: 'coach@lvm.local',
      role: 'TRAINER',
      emailVerified: true,
      mustChangePassword: false,
      profileComplete: true
    });
  });

  it('authenticates using a bearer token', async () => {
    tokens.verifyAccess.mockResolvedValue({
      sub: 'user-1',
      fullName: 'Maria Silva',
      email: 'coach@lvm.local',
      role: 'TRAINER',
      emailVerified: true,
      mustChangePassword: false,
      profileComplete: true,
      type: 'access'
    });

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Bearer bearer-token' }, cookies: {} }))
    ).resolves.toBe(true);
    expect(tokens.verifyAccess).toHaveBeenCalledWith('bearer-token');
  });

  it('rejects missing and invalid tokens', async () => {
    await expect(guard.canActivate(contextFor({ headers: {}, cookies: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException
    );

    tokens.verifyAccess.mockRejectedValue(new Error('expired'));
    await expect(
      guard.canActivate(contextFor({ headers: {}, cookies: { access_token: 'expired' } }))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive accounts even with a valid token', async () => {
    tokens.verifyAccess.mockResolvedValue({
      sub: 'user-1',
      fullName: 'Maria Silva',
      email: 'coach@lvm.local',
      role: 'TRAINER',
      emailVerified: true,
      mustChangePassword: false,
      profileComplete: true,
      type: 'access'
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isActive: false });

    await expect(
      guard.canActivate(contextFor({ headers: {}, cookies: { access_token: 'valid' } }))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
