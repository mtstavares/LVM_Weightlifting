import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './application/auth.service';
import { PASSWORD_HASHER } from './domain/password-hasher';
import { ACCOUNT_CODE_REPOSITORY } from './domain/account-code.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/refresh-token.repository';
import { TOKEN_SERVICE } from './domain/token-service';
import { USER_REPOSITORY } from './domain/user.repository';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';
import { PrismaAccountCodeRepository } from './infrastructure/prisma-account-code.repository';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';
import { RolesGuard } from './presentation/roles.guard';
import { PasswordChangeCompletedGuard } from './presentation/password-change-completed.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PasswordChangeCompletedGuard,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ACCOUNT_CODE_REPOSITORY, useClass: PrismaAccountCodeRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService }
  ],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    PasswordChangeCompletedGuard,
    AuthService,
    TOKEN_SERVICE
  ]
})
export class AuthModule {}
