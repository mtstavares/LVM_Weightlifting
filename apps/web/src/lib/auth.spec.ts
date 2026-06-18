import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  changePassword,
  changePasswordSchema,
  forgotPassword,
  getCurrentUser,
  login,
  loginSchema,
  logout,
  refreshSession,
  registerTrainer,
  resendVerification,
  trainerRegistrationSchema,
  verifyEmail
} from './auth';

afterEach(() => vi.restoreAllMocks());

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('auth validation', () => {
  it('validates login and secure trainer registration', () => {
    expect(loginSchema.safeParse({ email: 'trainer@lvm.local', password: 'x' }).success).toBe(true);
    expect(
      trainerRegistrationSchema.safeParse({
        fullName: 'Maria Silva',
        email: 'maria@lvm.local',
        password: 'Senha123!',
        passwordConfirmation: 'Senha123!'
      }).success
    ).toBe(true);
    expect(
      trainerRegistrationSchema.safeParse({
        fullName: 'Maria',
        email: 'invalid',
        password: 'weak',
        passwordConfirmation: 'different'
      }).success
    ).toBe(false);
  });

  it('validates password confirmation', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'Temp123!',
        newPassword: 'NovaSenha123!',
        passwordConfirmation: 'NovaSenha123!'
      }).success
    ).toBe(true);
  });
});

describe('auth api client', () => {
  it('executes all authentication endpoints', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse({ user: { id: '1', role: 'TRAINER' } }));

    await login({ email: 'trainer@lvm.local', password: 'Senha123!' });
    await registerTrainer({
      fullName: 'Maria Silva',
      email: 'maria@lvm.local',
      password: 'Senha123!',
      passwordConfirmation: 'Senha123!'
    });
    await verifyEmail('maria@lvm.local', '123456');
    await resendVerification('maria@lvm.local');
    await forgotPassword('maria@lvm.local');
    await changePassword({
      currentPassword: 'Temp123!',
      newPassword: 'NovaSenha123!',
      passwordConfirmation: 'NovaSenha123!'
    });
    await getCurrentUser();
    await refreshSession();

    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('handles logout without content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await expect(logout()).resolves.toBeUndefined();
  });

  it('surfaces api and fallback errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ message: 'Invalid credentials.' }, 401)
    );
    await expect(login({ email: 'x@y.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials.'
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('error', { status: 500 }));
    await expect(login({ email: 'x@y.com', password: 'wrong' })).rejects.toThrow(
      'Nao foi possivel concluir a solicitacao.'
    );
  });
});
