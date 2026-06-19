import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PasswordChangeCompletedGuard } from './password-change-completed.guard';

function context(mustChangePassword: boolean) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: '1',
          fullName: 'User',
          email: 'user@lvm.local',
          role: 'ATHLETE',
          emailVerified: true,
          mustChangePassword,
          profileComplete: false
        }
      })
    })
  } as unknown as ExecutionContext;
}

describe('PasswordChangeCompletedGuard', () => {
  it('allows completed passwords and blocks temporary sessions', () => {
    const guard = new PasswordChangeCompletedGuard();
    expect(guard.canActivate(context(false))).toBe(true);
    expect(() => guard.canActivate(context(true))).toThrow(ForbiddenException);
  });
});
