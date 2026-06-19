import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TOKEN_SERVICE, TokenService } from '../domain/token-service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    const token = request.cookies?.access_token ?? bearerToken;

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      const payload = await this.tokens.verifyAccess(token);
      const account = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isActive: true }
      });
      if (!account?.isActive) throw new UnauthorizedException('Account is inactive.');
      request.user = {
        id: payload.sub,
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        emailVerified: payload.emailVerified,
        mustChangePassword: payload.mustChangePassword,
        profileComplete: payload.profileComplete
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
