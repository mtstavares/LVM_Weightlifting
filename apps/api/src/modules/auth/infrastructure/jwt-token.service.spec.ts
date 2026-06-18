import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const values: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access-secret-for-tests',
    JWT_REFRESH_SECRET: 'refresh-secret-for-tests',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d'
  };
  const config = {
    getOrThrow: (key: string) => values[key],
    get: (key: string, fallback: string) => values[key] ?? fallback
  } as unknown as ConfigService;
  const service = new JwtTokenService(new JwtService(), config);

  it('issues unique token pairs even for the same payload', async () => {
    const payload = {
      sub: 'user-1',
      fullName: 'Maria Silva',
      email: 'coach@lvm.local',
      role: 'TRAINER' as const,
      emailVerified: true,
      mustChangePassword: false
    };

    const first = await service.issue(payload);
    const second = await service.issue(payload);

    expect(first.accessToken).not.toBe(second.accessToken);
    expect(first.refreshToken).not.toBe(second.refreshToken);
    await expect(service.verifyAccess(first.accessToken)).resolves.toMatchObject({
      sub: payload.sub,
      type: 'access'
    });
    await expect(service.verifyRefresh(first.refreshToken)).resolves.toMatchObject({
      sub: payload.sub,
      type: 'refresh'
    });
  });

  it('hashes tokens consistently', () => {
    expect(service.hash('token')).toBe(service.hash('token'));
    expect(service.hash('token')).not.toBe(service.hash('another-token'));
  });
});
