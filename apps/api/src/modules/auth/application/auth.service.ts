import { randomBytes, randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../../shared/application/audit.service';
import { MAIL_SERVICE, MailService } from '../../../shared/domain/mail.service';
import {
  ACCOUNT_CODE_REPOSITORY,
  AccountCodeRepository
} from '../domain/account-code.repository';
import {
  AccountInactiveError,
  AccountLockedError,
  EmailAlreadyInUseError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  InvalidVerificationCodeError,
  PasswordMismatchError,
  TemporaryPasswordExpiredError
} from '../domain/auth.errors';
import { AuthTokens, AuthUser, SafeAuthUser } from '../domain/auth.types';
import { PASSWORD_HASHER, PasswordHasher } from '../domain/password-hasher';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository
} from '../domain/refresh-token.repository';
import { TOKEN_SERVICE, TokenService } from '../domain/token-service';
import { USER_REPOSITORY, UserRepository } from '../domain/user.repository';

export type AuthResult = {
  user: SafeAuthUser;
  tokens: AuthTokens;
};

export type PendingVerificationResult = {
  email: string;
  verificationRequired: true;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ACCOUNT_CODE_REPOSITORY) private readonly accountCodes: AccountCodeRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    private readonly audit: AuditService
  ) {}

  async registerTrainer(
    fullName: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PendingVerificationResult> {
    if (password !== passwordConfirmation) {
      throw new PasswordMismatchError();
    }

    const normalizedEmail = this.normalizeEmail(email);
    if (await this.users.findByEmail(normalizedEmail)) {
      throw new EmailAlreadyInUseError();
    }

    const user = await this.users.createTrainer(
      fullName.trim(),
      normalizedEmail,
      await this.passwordHasher.hash(password)
    );
    await this.audit.record({
      event: 'TRAINER_REGISTERED',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      actorUserId: user.id,
      affectedUserId: user.id,
      description: `Treinador ${user.fullName} criou sua conta.`
    });
    await this.sendVerificationCode(user, ipAddress, userAgent);

    return {
      email: user.email,
      verificationRequired: true
    };
  }

  async verifyEmail(
    email: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const user = await this.users.findByEmail(this.normalizeEmail(email));
    const accountCode = user
      ? await this.accountCodes.findActiveEmailVerificationCode(user.id)
      : null;

    if (
      !user ||
      !accountCode ||
      accountCode.expiresAt <= new Date() ||
      accountCode.attempts >= accountCode.maxAttempts
    ) {
      await this.recordVerificationFailure(user, ipAddress, userAgent);
      throw new InvalidVerificationCodeError();
    }

    if (accountCode.codeHash !== this.tokenService.hash(code.trim())) {
      await this.accountCodes.incrementAttempts(accountCode.id);
      await this.recordVerificationFailure(user, ipAddress, userAgent);
      throw new InvalidVerificationCodeError();
    }

    await this.accountCodes.markUsed(accountCode.id);
    const verifiedUser = await this.users.markEmailVerified(user.id);
    await this.audit.record({
      event: 'EMAIL_VERIFIED',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      actorUserId: user.id,
      affectedUserId: user.id,
      description: `${user.fullName} confirmou o e-mail da conta.`
    });
    return this.createSession(verifiedUser);
  }

  async resendVerificationCode(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await this.users.findByEmail(this.normalizeEmail(email));
    if (!user || user.emailVerifiedAt) {
      return;
    }
    await this.sendVerificationCode(user, ipAddress, userAgent);
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.users.findByEmail(normalizedEmail);

    if (!user) {
      await this.audit.record({
        event: 'LOGIN_FAILED',
        email: normalizedEmail,
        ipAddress,
        userAgent,
        result: 'FAILURE',
        description: `Falha de login para o e-mail ${normalizedEmail}.`
      });
      throw new InvalidCredentialsError();
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError();
    }
    if (!(await this.passwordHasher.compare(password, user.passwordHash))) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const lockedUntil = nextAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await this.users.recordFailedLogin(user.id, lockedUntil);
      await this.audit.record({
        event: 'LOGIN_FAILED',
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        actorUserId: user.id,
        affectedUserId: user.id,
        result: 'FAILURE',
        description: `Falha de login para o e-mail ${user.email}.`,
        metadata: { attempts: nextAttempts, locked: Boolean(lockedUntil) }
      });
      throw new InvalidCredentialsError();
    }
    if (!user.emailVerifiedAt) {
      throw new EmailNotVerifiedError();
    }
    if (!user.isActive) {
      throw new AccountInactiveError();
    }
    if (user.mustChangePassword) {
      if (
        !user.temporaryPasswordExpiresAt ||
        user.temporaryPasswordExpiresAt <= new Date() ||
        user.temporaryPasswordUsedAt
      ) {
        throw new TemporaryPasswordExpiredError();
      }
      await this.users.markTemporaryPasswordUsed(user.id);
    }

    const firstLogin = !user.firstLoginAt;
    const loggedUser = await this.users.recordSuccessfulLogin(user.id, firstLogin);
    await this.audit.record({
      event: 'LOGIN_SUCCEEDED',
      userId: user.id,
      actorUserId: user.id,
      affectedUserId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      description: `${user.fullName} realizou login com sucesso.`
    });
    if (firstLogin && user.role === 'ATHLETE') {
      await this.audit.record({
        event: 'ATHLETE_FIRST_LOGIN',
        userId: user.id,
        actorUserId: user.id,
        affectedUserId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        description: `Atleta ${user.fullName} realizou o primeiro login.`
      });
    }
    return this.createSession(loggedUser);
  }

  async forgotPassword(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.users.findByEmail(normalizedEmail);
    await this.audit.record({
      event: 'PASSWORD_RECOVERY_REQUESTED',
      userId: user?.id,
      email: normalizedEmail,
      ipAddress,
      userAgent,
      affectedUserId: user?.id,
      description: `Solicitacao de recuperacao de senha para ${normalizedEmail}.`
    });

    if (!user || !user.emailVerifiedAt || !user.isActive) {
      return;
    }

    await this.sendTemporaryPassword(user, 'Recuperacao de senha');
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    passwordConfirmation: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    if (newPassword !== passwordConfirmation) {
      throw new PasswordMismatchError();
    }

    const user = await this.users.findById(userId);
    if (!user || !(await this.passwordHasher.compare(currentPassword, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    const updatedUser = await this.users.updatePassword(
      user.id,
      await this.passwordHasher.hash(newPassword)
    );
    await this.refreshTokens.revokeAllForUser(user.id);
    await this.audit.record({
      event: 'PASSWORD_CHANGED',
      userId: user.id,
      actorUserId: user.id,
      affectedUserId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      description: `${user.fullName} alterou a senha da conta.`
    });
    if (user.role === 'ATHLETE' && user.mustChangePassword) {
      await this.audit.record({
        event: 'ATHLETE_TEMPORARY_PASSWORD_CHANGED',
        userId: user.id,
        actorUserId: user.id,
        affectedUserId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        description: `Atleta ${user.fullName} substituiu a senha temporaria.`
      });
    }
    return this.createSession(updatedUser);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    try {
      const payload = await this.tokenService.verifyRefresh(refreshToken);
      const tokenHash = this.tokenService.hash(refreshToken);
      const storedToken = await this.refreshTokens.findActiveByHash(tokenHash);
      const user = await this.users.findById(payload.sub);

      if (
        !storedToken ||
        storedToken.userId !== payload.sub ||
        storedToken.expiresAt <= new Date() ||
        !user ||
        !user.isActive ||
        !user.emailVerifiedAt
      ) {
        throw new InvalidRefreshTokenError();
      }

      await this.refreshTokens.revokeByHash(tokenHash);
      return this.createSession(user);
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        throw error;
      }
      throw new InvalidRefreshTokenError();
    }
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.refreshTokens.revokeByHash(this.tokenService.hash(refreshToken));
    }
  }

  async sendAthleteTemporaryPassword(user: AuthUser): Promise<void> {
    await this.sendTemporaryPassword(user, 'Primeiro acesso do atleta');
  }

  private async createSession(user: AuthUser): Promise<AuthResult> {
    const tokens = await this.tokenService.issue({
      sub: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      mustChangePassword: user.mustChangePassword
    });
    await this.refreshTokens.create(
      user.id,
      this.tokenService.hash(tokens.refreshToken),
      tokens.refreshExpiresAt
    );

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt),
        mustChangePassword: user.mustChangePassword
      },
      tokens
    };
  }

  private async sendVerificationCode(
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const code = randomInt(100000, 1_000_000).toString();
    await this.accountCodes.replaceEmailVerificationCode(
      user.id,
      this.tokenService.hash(code),
      new Date(Date.now() + 15 * 60 * 1000)
    );
    await this.mail.send({
      to: user.email,
      subject: 'Confirme seu e-mail - LVM Weightlifting',
      text: `Seu codigo de confirmacao e ${code}. Ele expira em 15 minutos.`,
      html: `<p>Seu codigo de confirmacao e:</p><p><strong>${code}</strong></p><p>Ele expira em 15 minutos.</p>`
    });
    await this.audit.record({
      event: 'EMAIL_VERIFICATION_SENT',
      userId: user.id,
      actorUserId: user.id,
      affectedUserId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      description: `Codigo de confirmacao enviado para ${user.email}.`
    });
  }

  private async sendTemporaryPassword(user: AuthUser, reason: string): Promise<void> {
    const temporaryPassword = `Lvm!${randomBytes(7).toString('base64url')}`;
    await this.users.setTemporaryPassword(
      user.id,
      await this.passwordHasher.hash(temporaryPassword),
      new Date(Date.now() + 30 * 60 * 1000)
    );
    await this.refreshTokens.revokeAllForUser(user.id);
    await this.mail.send({
      to: user.email,
      subject: `${reason} - LVM Weightlifting`,
      text: `Sua senha temporaria e ${temporaryPassword}. Ela expira em 30 minutos e pode ser usada uma unica vez.`,
      html: `<p>Sua senha temporaria e:</p><p><strong>${temporaryPassword}</strong></p><p>Ela expira em 30 minutos e pode ser usada uma unica vez.</p>`
    });
    await this.audit.record({
      event: 'TEMPORARY_PASSWORD_SENT',
      userId: user.id,
      email: user.email,
      metadata: { reason }
    });
  }

  private async recordVerificationFailure(
    user: AuthUser | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.audit.record({
      event: 'EMAIL_VERIFICATION_FAILED',
      userId: user?.id,
      actorUserId: user?.id,
      affectedUserId: user?.id,
      email: user?.email,
      ipAddress,
      userAgent,
      result: 'FAILURE',
      description: `Falha na confirmacao de e-mail${user ? ` de ${user.fullName}` : ''}.`
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
