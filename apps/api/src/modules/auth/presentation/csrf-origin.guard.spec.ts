import { ForbiddenException } from '@nestjs/common';
import { CsrfOriginGuard } from './csrf-origin.guard';

function contextFor(request: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as any;
}

describe('CsrfOriginGuard', () => {
  const guard = new CsrfOriginGuard({ get: jest.fn(() => 'http://localhost:3000') } as any);

  it('allows safe methods', () => {
    expect(guard.canActivate(contextFor({ method: 'GET', cookies: { access_token: 'token' }, headers: { origin: 'https://evil.test' } }))).toBe(true);
  });

  it('allows bearer-style requests without auth cookies', () => {
    expect(guard.canActivate(contextFor({ method: 'POST', cookies: {}, headers: { origin: 'https://evil.test' } }))).toBe(true);
  });

  it('allows configured web origin for cookie mutations', () => {
    expect(guard.canActivate(contextFor({ method: 'POST', cookies: { access_token: 'token' }, headers: { origin: 'http://localhost:3000' } }))).toBe(true);
  });

  it('blocks cross-origin cookie mutations', () => {
    expect(() => guard.canActivate(contextFor({ method: 'POST', cookies: { access_token: 'token' }, headers: { origin: 'https://evil.test' } }))).toThrow(ForbiddenException);
  });
});
