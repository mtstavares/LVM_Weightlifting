import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TOKEN_SERVICE, TokenService } from '../domain/token-service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

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
      request.user = {
        id: payload.sub,
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        emailVerified: payload.emailVerified,
        mustChangePassword: payload.mustChangePassword
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
