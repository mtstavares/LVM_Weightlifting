import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { SafeAuthUser } from '../domain/auth.types';

@Injectable()
export class PasswordChangeCompletedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: SafeAuthUser }>();
    if (request.user?.mustChangePassword) {
      throw new ForbiddenException('Password change required.');
    }
    return true;
  }
}
