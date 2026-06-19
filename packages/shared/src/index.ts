export type UserRole = 'TRAINER' | 'ATHLETE';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  mustChangePassword: boolean;
  profileComplete: boolean;
};
