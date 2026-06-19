import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../../shared/application/audit.service';
import { AuthRole, SafeAuthUser } from '../domain/auth.types';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: SafeAuthUser;
      ip?: string;
      get?: (name: string) => string | undefined;
      method?: string;
      originalUrl?: string;
    }>();
    if (!request.user || !roles.includes(request.user.role)) {
      if (request.user) {
        await this.audit.record({
          event: 'ACCESS_DENIED',
          userId: request.user.id,
          actorUserId: request.user.id,
          affectedUserId: request.user.id,
          email: request.user.email,
          result: 'FAILURE',
          ipAddress: request.ip,
          userAgent: request.get?.('user-agent'),
          description: `${request.user.fullName} tentou acessar um recurso sem permissao.`,
          metadata: {
            method: request.method ?? null,
            path: request.originalUrl ?? null,
            requiredRoles: roles
          }
        });
      }
      throw new ForbiddenException('Insufficient permissions.');
    }
    return true;
  }
}
