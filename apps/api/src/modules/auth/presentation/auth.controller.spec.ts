import { Response } from 'express';
import { AuthService } from '../application/auth.service';
import { AuthController } from './auth.controller';

describe('AuthController session cookies', () => {
  const controller = new AuthController({} as AuthService);
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn()
  } as unknown as Response;

  beforeEach(() => jest.clearAllMocks());

  it('uses a proxy-compatible refresh cookie path', () => {
    (controller as unknown as {
      respondWithSession: (result: unknown, response: Response) => unknown;
    }).respondWithSession(
      {
        user: { id: 'user-1' },
        tokens: {
          accessToken: 'access',
          refreshToken: 'refresh',
          refreshExpiresAt: new Date('2030-01-01')
        }
      },
      response
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh',
      expect.objectContaining({ path: '/' })
    );
  });

  it('clears current and legacy refresh cookie paths', () => {
    (controller as unknown as {
      clearSessionCookies: (response: Response) => void;
    }).clearSessionCookies(response);

    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/' });
    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/auth' });
  });
});
