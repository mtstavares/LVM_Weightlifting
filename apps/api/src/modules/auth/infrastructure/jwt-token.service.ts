import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { AuthTokens, TokenPayload } from '../domain/auth.types';
import { TokenService } from '../domain/token-service';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async issue(payload: Omit<TokenPayload, 'type'>): Promise<AuthTokens> {
    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.config.get<SignOptions['expiresIn']>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.config.get<SignOptions['expiresIn']>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshExpiresAt = new Date(Date.now() + this.durationToMilliseconds(String(refreshExpiresIn)));

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...payload, type: 'access' },
        { secret: accessSecret, expiresIn: accessExpiresIn, jwtid: randomUUID() }
      ),
      this.jwt.signAsync(
        { ...payload, type: 'refresh' },
        { secret: refreshSecret, expiresIn: refreshExpiresIn, jwtid: randomUUID() }
      )
    ]);

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  async verifyAccess(token: string): Promise<TokenPayload> {
    const payload = await this.jwt.verifyAsync<TokenPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
    });
    if (payload.type !== 'access') {
      throw new Error('Invalid token type.');
    }
    return payload;
  }

  async verifyRefresh(token: string): Promise<TokenPayload> {
    const payload = await this.jwt.verifyAsync<TokenPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
    });
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type.');
    }
    return payload;
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private durationToMilliseconds(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      throw new Error('Invalid token duration.');
    }

    const value = Number(match[1]);
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * multipliers[match[2] as keyof typeof multipliers];
  }
}
