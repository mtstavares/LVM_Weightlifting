import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../../shared/application/audit.service';
import { RolesGuard } from './roles.guard';

function contextFor(user?: {
  id: string;
  fullName: string;
  email: string;
  role: 'TRAINER' | 'ATHLETE';
  emailVerified: boolean;
  mustChangePassword: boolean;
  profileComplete: boolean;
}) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ user })
    })
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

  beforeEach(() => jest.clearAllMocks());

  it('allows endpoints without role metadata', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    await expect(new RolesGuard(reflector, audit).canActivate(contextFor())).resolves.toBe(true);
  });

  it('allows users with a required role', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['TRAINER']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, audit);

    await expect(
      guard.canActivate(contextFor({ id: '1', fullName: 'Coach', email: 'coach@lvm.local', role: 'TRAINER', emailVerified: true, mustChangePassword: false, profileComplete: true }))
    ).resolves.toBe(true);
  });

  it('rejects missing users and audits users with another role', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['TRAINER']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, audit);

    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(contextFor({ id: '1', fullName: 'Athlete', email: 'athlete@lvm.local', role: 'ATHLETE', emailVerified: true, mustChangePassword: false, profileComplete: true }))
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ACCESS_DENIED', result: 'FAILURE' })
    );
  });
});
