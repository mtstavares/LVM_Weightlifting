import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { SafeAuthUser } from '../domain/auth.types';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class ProfileCompletedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: SafeAuthUser }>();
    if (request.user?.role !== 'ATHLETE') return true;

    const athlete = await this.prisma.athlete.findUnique({
      where: { userId: request.user.id },
      select: { profileStatus: true }
    });
    if (athlete?.profileStatus !== 'PROFILE_COMPLETE') {
      throw new ForbiddenException('Profile completion required.');
    }
    return true;
  }
}
