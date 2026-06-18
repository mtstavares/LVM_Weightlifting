import { AuthTokens, TokenPayload } from './auth.types';

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenService {
  issue(payload: Omit<TokenPayload, 'type'>): Promise<AuthTokens>;
  verifyAccess(token: string): Promise<TokenPayload>;
  verifyRefresh(token: string): Promise<TokenPayload>;
  hash(token: string): string;
}
