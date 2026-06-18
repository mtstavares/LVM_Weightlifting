import { Request } from 'express';
import { SafeAuthUser } from '../domain/auth.types';

export type AuthenticatedRequest = Request & {
  user: SafeAuthUser;
};
