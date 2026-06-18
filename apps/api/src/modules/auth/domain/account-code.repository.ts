export const ACCOUNT_CODE_REPOSITORY = Symbol('ACCOUNT_CODE_REPOSITORY');

export type AccountCodeRecord = {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
  maxAttempts: number;
};

export interface AccountCodeRepository {
  replaceEmailVerificationCode(userId: string, codeHash: string, expiresAt: Date): Promise<void>;
  findActiveEmailVerificationCode(userId: string): Promise<AccountCodeRecord | null>;
  incrementAttempts(id: string): Promise<void>;
  markUsed(id: string): Promise<void>;
}
