import type { AuthUser } from '@lvm/shared';
import { z } from 'zod';
import { apiRequest, sameOriginRequest } from './api-client';

const passwordRule = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/[a-z]/, 'Inclua uma letra minúscula.')
  .regex(/[A-Z]/, 'Inclua uma letra maiúscula.')
  .regex(/\d/, 'Inclua um número.')
  .regex(/[^A-Za-z0-9]/, 'Inclua um caractere especial.');

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.')
});

export const trainerRegistrationSchema = z
  .object({
    fullName: z.string().min(3, 'Informe o nome completo.'),
    email: z.string().email('Informe um e-mail válido.'),
    password: passwordRule,
    passwordConfirmation: z.string()
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem.',
    path: ['passwordConfirmation']
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordRule,
    passwordConfirmation: z.string()
  })
  .refine((data) => data.newPassword === data.passwordConfirmation, {
    message: 'As senhas não coincidem.',
    path: ['passwordConfirmation']
  });

export type LoginCredentials = z.infer<typeof loginSchema>;
export type TrainerRegistration = z.infer<typeof trainerRegistrationSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

export function login(credentials: LoginCredentials) {
  return apiRequest<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
}

export function registerTrainer(input: TrainerRegistration) {
  return apiRequest<{ email: string; verificationRequired: true }>('/auth/register/trainer', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function verifyEmail(email: string, code: string) {
  return apiRequest<{ user: AuthUser }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  });
}

export function resendVerification(email: string) {
  return apiRequest<void>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export function forgotPassword(email: string) {
  return apiRequest<void>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export function changePassword(input: ChangePassword) {
  return apiRequest<{ user: AuthUser }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function getCurrentUser() {
  return apiRequest<AuthUser>('/auth/me');
}

export function refreshSession() {
  return sameOriginRequest<{ user: AuthUser }>('/auth/refresh', { method: 'POST' });
}

export function logout() {
  return sameOriginRequest<void>('/auth/logout', { method: 'POST' });
}
