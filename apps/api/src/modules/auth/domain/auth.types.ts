export type AuthRole = 'TRAINER' | 'ATHLETE';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: AuthRole;
  emailVerifiedAt: Date | null;
  mustChangePassword: boolean;
  isActive: boolean;
  temporaryPasswordExpiresAt: Date | null;
  temporaryPasswordUsedAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  firstLoginAt: Date | null;
  lastLoginAt: Date | null;
  lastPasswordChangeAt: Date | null;
};

export type SafeAuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: AuthRole;
  emailVerified: boolean;
  mustChangePassword: boolean;
};

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type TokenPayload = {
  sub: string;
  fullName: string;
  email: string;
  role: AuthRole;
  emailVerified: boolean;
  mustChangePassword: boolean;
  type: 'access' | 'refresh';
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};
