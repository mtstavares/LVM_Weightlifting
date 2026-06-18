import { AuditService } from '../../../shared/application/audit.service';
import { MailService } from '../../../shared/domain/mail.service';
import { AccountCodeRepository } from '../domain/account-code.repository';
import {
  AccountInactiveError,
  AccountLockedError,
  EmailAlreadyInUseError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidVerificationCodeError,
  PasswordMismatchError,
  TemporaryPasswordExpiredError
} from '../domain/auth.errors';
import { AuthUser } from '../domain/auth.types';
import { PasswordHasher } from '../domain/password-hasher';
import { RefreshTokenRepository } from '../domain/refresh-token.repository';
import { TokenService } from '../domain/token-service';
import { UserRepository } from '../domain/user.repository';
import { AuthService } from './auth.service';

const user: AuthUser = {
  id: 'user-1',
  fullName: 'Maria Silva',
  email: 'maria@lvm.local',
  passwordHash: 'hash',
  role: 'TRAINER',
  emailVerifiedAt: new Date('2026-01-01'),
  mustChangePassword: false,
  isActive: true,
  temporaryPasswordExpiresAt: null,
  temporaryPasswordUsedAt: null,
  failedLoginAttempts: 0,
  lockedUntil: null
};

describe('AuthService', () => {
  let users: jest.Mocked<UserRepository>;
  let codes: jest.Mocked<AccountCodeRepository>;
  let refresh: jest.Mocked<RefreshTokenRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let tokens: jest.Mocked<TokenService>;
  let mail: jest.Mocked<MailService>;
  let audit: jest.Mocked<AuditService>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createTrainer: jest.fn(),
      markEmailVerified: jest.fn(),
      updatePassword: jest.fn(),
      setTemporaryPassword: jest.fn(),
      markTemporaryPasswordUsed: jest.fn(),
      recordFailedLogin: jest.fn(),
      resetFailedLogin: jest.fn()
    };
    codes = {
      replaceEmailVerificationCode: jest.fn(),
      findActiveEmailVerificationCode: jest.fn(),
      incrementAttempts: jest.fn(),
      markUsed: jest.fn()
    };
    refresh = {
      create: jest.fn(),
      findActiveByHash: jest.fn(),
      revokeByHash: jest.fn(),
      revokeAllForUser: jest.fn()
    };
    hasher = { hash: jest.fn().mockResolvedValue('hash'), compare: jest.fn() };
    tokens = {
      issue: jest.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        refreshExpiresAt: new Date('2030-01-01')
      }),
      verifyAccess: jest.fn(),
      verifyRefresh: jest.fn(),
      hash: jest.fn((value) => `hash-${value}`)
    };
    mail = { send: jest.fn() };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new AuthService(users, codes, refresh, hasher, tokens, mail, audit);
  });

  it('registers an inactive trainer and sends verification', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.createTrainer.mockResolvedValue({ ...user, emailVerifiedAt: null, isActive: false });

    await expect(
      service.registerTrainer(' Maria Silva ', ' MARIA@LVM.LOCAL ', 'Senha123!', 'Senha123!')
    ).resolves.toEqual({ email: user.email, verificationRequired: true });
    expect(users.createTrainer).toHaveBeenCalledWith('Maria Silva', user.email, 'hash');
    expect(codes.replaceEmailVerificationCode).toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalled();
  });

  it('rejects mismatched passwords and duplicate email', async () => {
    await expect(
      service.registerTrainer('Maria Silva', user.email, 'Senha123!', 'Outra123!')
    ).rejects.toBeInstanceOf(PasswordMismatchError);
    users.findByEmail.mockResolvedValue(user);
    await expect(
      service.registerTrainer('Maria Silva', user.email, 'Senha123!', 'Senha123!')
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it('verifies a valid code and rejects invalid or exhausted codes', async () => {
    users.findByEmail.mockResolvedValue(user);
    codes.findActiveEmailVerificationCode.mockResolvedValue({
      id: 'code-1',
      userId: user.id,
      codeHash: 'hash-123456',
      expiresAt: new Date('2030-01-01'),
      usedAt: null,
      attempts: 0,
      maxAttempts: 5
    });
    users.markEmailVerified.mockResolvedValue(user);
    await expect(service.verifyEmail(user.email, '123456')).resolves.toMatchObject({
      user: { id: user.id }
    });

    codes.findActiveEmailVerificationCode.mockResolvedValueOnce({
      id: 'code-2',
      userId: user.id,
      codeHash: 'other',
      expiresAt: new Date('2030-01-01'),
      usedAt: null,
      attempts: 4,
      maxAttempts: 5
    });
    await expect(service.verifyEmail(user.email, '000000')).rejects.toBeInstanceOf(
      InvalidVerificationCodeError
    );
    expect(codes.incrementAttempts).toHaveBeenCalledWith('code-2');

    codes.findActiveEmailVerificationCode.mockResolvedValueOnce({
      id: 'code-3',
      userId: user.id,
      codeHash: 'hash-123456',
      expiresAt: new Date('2020-01-01'),
      usedAt: null,
      attempts: 5,
      maxAttempts: 5
    });
    await expect(service.verifyEmail(user.email, '123456')).rejects.toBeInstanceOf(
      InvalidVerificationCodeError
    );
  });

  it('logs in active users and blocks invalid attempts', async () => {
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);
    await expect(service.login(user.email, 'Senha123!')).resolves.toMatchObject({
      user: { role: 'TRAINER' }
    });

    hasher.compare.mockResolvedValue(false);
    await expect(service.login(user.email, 'wrong')).rejects.toBeInstanceOf(
      InvalidCredentialsError
    );
    expect(users.recordFailedLogin).toHaveBeenCalled();

    users.findByEmail.mockResolvedValue({ ...user, lockedUntil: new Date('2030-01-01') });
    await expect(service.login(user.email, 'Senha123!')).rejects.toBeInstanceOf(AccountLockedError);
  });

  it('enforces verification and one-time temporary password', async () => {
    hasher.compare.mockResolvedValue(true);
    users.findByEmail.mockResolvedValue({ ...user, emailVerifiedAt: null });
    await expect(service.login(user.email, 'Senha123!')).rejects.toBeInstanceOf(
      EmailNotVerifiedError
    );

    users.findByEmail.mockResolvedValue({
      ...user,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date('2030-01-01'),
      temporaryPasswordUsedAt: null
    });
    await expect(service.login(user.email, 'Temp123!')).resolves.toMatchObject({
      user: { mustChangePassword: true }
    });
    expect(users.markTemporaryPasswordUsed).toHaveBeenCalled();

    users.findByEmail.mockResolvedValue({
      ...user,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date('2020-01-01'),
      temporaryPasswordUsedAt: null
    });
    await expect(service.login(user.email, 'Temp123!')).rejects.toBeInstanceOf(
      TemporaryPasswordExpiredError
    );

    users.findByEmail.mockResolvedValue({ ...user, isActive: false });
    await expect(service.login(user.email, 'Senha123!')).rejects.toBeInstanceOf(
      AccountInactiveError
    );

    users.findByEmail.mockResolvedValue({
      ...user,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date('2030-01-01'),
      temporaryPasswordUsedAt: new Date()
    });
    await expect(service.login(user.email, 'Temp123!')).rejects.toBeInstanceOf(
      TemporaryPasswordExpiredError
    );
  });

  it('uses generic recovery and changes password', async () => {
    users.findByEmail.mockResolvedValue(null);
    await service.forgotPassword('unknown@lvm.local');
    expect(mail.send).not.toHaveBeenCalled();

    users.findByEmail.mockResolvedValue(user);
    await service.forgotPassword(user.email);
    expect(users.setTemporaryPassword).toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalled();

    users.findById.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);
    users.updatePassword.mockResolvedValue(user);
    await expect(
      service.changePassword(user.id, 'Temp123!', 'NovaSenha123!', 'NovaSenha123!')
    ).resolves.toMatchObject({ user: { id: user.id } });
    expect(refresh.revokeAllForUser).toHaveBeenCalledWith(user.id);

    await expect(
      service.changePassword(user.id, 'Temp123!', 'NovaSenha123!', 'Diferente123!')
    ).rejects.toBeInstanceOf(PasswordMismatchError);
    hasher.compare.mockResolvedValue(false);
    await expect(
      service.changePassword(user.id, 'wrong', 'NovaSenha123!', 'NovaSenha123!')
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('resends verification without revealing accounts and logs out', async () => {
    users.findByEmail.mockResolvedValue(null);
    await service.resendVerificationCode('unknown@lvm.local');
    expect(mail.send).not.toHaveBeenCalled();
    await service.logout();
    await service.logout('refresh');
    expect(refresh.revokeByHash).toHaveBeenCalled();
  });

  it('rotates valid refresh tokens and rejects invalid ones', async () => {
    tokens.verifyRefresh.mockResolvedValue({
      sub: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      emailVerified: true,
      mustChangePassword: false,
      type: 'refresh'
    });
    refresh.findActiveByHash.mockResolvedValue({
      id: 'token-1',
      userId: user.id,
      tokenHash: 'hash-refresh',
      expiresAt: new Date('2030-01-01'),
      revokedAt: null
    });
    users.findById.mockResolvedValue(user);
    await expect(service.refresh('refresh')).resolves.toMatchObject({ user: { id: user.id } });

    refresh.findActiveByHash.mockResolvedValue(null);
    await expect(service.refresh('invalid')).rejects.toBeDefined();
    tokens.verifyRefresh.mockRejectedValue(new Error('malformed'));
    await expect(service.refresh('malformed')).rejects.toBeDefined();
  });
});
