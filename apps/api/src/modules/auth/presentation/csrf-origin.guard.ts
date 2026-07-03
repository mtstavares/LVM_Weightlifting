import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CsrfOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
    if (!request.cookies?.access_token && !request.cookies?.refresh_token) return true;

    const origin = request.headers.origin;
    if (!origin) return true;

    const allowedOrigin = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    if (origin !== allowedOrigin) {
      throw new ForbiddenException('Invalid request origin.');
    }
    return true;
  }
}
