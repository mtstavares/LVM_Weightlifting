import type { AuthUser } from '@lvm/shared';
import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/[a-z]/, 'Inclua uma letra minuscula.')
  .regex(/[A-Z]/, 'Inclua uma letra maiuscula.')
  .regex(/\d/, 'Inclua um numero.')
  .regex(/[^A-Za-z0-9]/, 'Inclua um caractere especial.');

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail valido.'),
  password: z.string().min(1, 'Informe sua senha.')
});

export const trainerRegistrationSchema = z
  .object({
    fullName: z.string().min(3, 'Informe o nome completo.'),
    email: z.string().email('Informe um e-mail valido.'),
    password: passwordRule,
    passwordConfirmation: z.string()
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas nao coincidem.',
    path: ['passwordConfirmation']
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordRule,
    passwordConfirmation: z.string()
  })
  .refine((data) => data.newPassword === data.passwordConfirmation, {
    message: 'As senhas nao coincidem.',
    path: ['passwordConfirmation']
  });

export type LoginCredentials = z.infer<typeof loginSchema>;
export type TrainerRegistration = z.infer<typeof trainerRegistrationSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Nao foi possivel concluir a solicitacao.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function login(credentials: LoginCredentials) {
  return request<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
}

export function registerTrainer(input: TrainerRegistration) {
  return request<{ email: string; verificationRequired: true }>('/auth/register/trainer', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function verifyEmail(email: string, code: string) {
  return request<{ user: AuthUser }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  });
}

export function resendVerification(email: string) {
  return request<void>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export function forgotPassword(email: string) {
  return request<void>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export function changePassword(input: ChangePassword) {
  return request<{ user: AuthUser }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function getCurrentUser() {
  return request<AuthUser>('/auth/me');
}

export function refreshSession() {
  return request<{ user: AuthUser }>('/auth/refresh', { method: 'POST' });
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' });
}
