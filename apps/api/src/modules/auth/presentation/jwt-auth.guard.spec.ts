import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../domain/token-service';
import { JwtAuthGuard } from './jwt-auth.guard';

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
  const guard = new JwtAuthGuard(tokens);

  beforeEach(() => jest.clearAllMocks());

  it('authenticates using an access cookie', async () => {
    const request = { headers: {}, cookies: { access_token: 'cookie-token' } };
    tokens.verifyAccess.mockResolvedValue({
      sub: 'user-1',
      fullName: 'Maria Silva',
      email: 'coach@lvm.local',
      role: 'TRAINER',
      emailVerified: true,
      mustChangePassword: false,
      type: 'access'
    });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user', {
      id: 'user-1',
      fullName: 'Maria Silva',
      email: 'coach@lvm.local',
      role: 'TRAINER',
      emailVerified: true,
      mustChangePassword: false
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
});
