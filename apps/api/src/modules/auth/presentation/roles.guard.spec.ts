import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextFor(user?: {
  id: string;
  fullName: string;
  email: string;
  role: 'TRAINER' | 'ATHLETE';
  emailVerified: boolean;
  mustChangePassword: boolean;
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
  it('allows endpoints without role metadata', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor())).toBe(true);
  });

  it('allows users with a required role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['TRAINER']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(contextFor({ id: '1', fullName: 'Coach', email: 'coach@lvm.local', role: 'TRAINER', emailVerified: true, mustChangePassword: false }))
    ).toBe(true);
  });

  it('rejects missing users and users with another role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['TRAINER']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor({ id: '1', fullName: 'Athlete', email: 'athlete@lvm.local', role: 'ATHLETE', emailVerified: true, mustChangePassword: false }))
    ).toThrow(ForbiddenException);
  });
});
