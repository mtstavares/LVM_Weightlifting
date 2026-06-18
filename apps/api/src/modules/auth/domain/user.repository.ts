import { AuthUser } from './auth.types';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  createTrainer(fullName: string, email: string, passwordHash: string): Promise<AuthUser>;
  markEmailVerified(userId: string): Promise<AuthUser>;
  updatePassword(userId: string, passwordHash: string): Promise<AuthUser>;
  setTemporaryPassword(userId: string, passwordHash: string, expiresAt: Date): Promise<AuthUser>;
  markTemporaryPasswordUsed(userId: string): Promise<AuthUser>;
  recordFailedLogin(userId: string, lockedUntil: Date | null): Promise<void>;
  resetFailedLogin(userId: string): Promise<void>;
  recordSuccessfulLogin(userId: string, firstLogin: boolean): Promise<AuthUser>;
}
