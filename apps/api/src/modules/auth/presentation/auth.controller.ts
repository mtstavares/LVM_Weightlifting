import {
  Body,
  ConflictException,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  ForbiddenException,
  UseGuards
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthResult, AuthService } from '../application/auth.service';
import {
  AccountInactiveError,
  AccountLockedError,
  EmailNotVerifiedError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  InvalidVerificationCodeError,
  PasswordMismatchError,
  TemporaryPasswordExpiredError
} from '../domain/auth.errors';
import { LoginDto } from './dto/login.dto';
import { RegisterCoachDto } from './dto/register-coach.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailDto } from './dto/email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthenticatedRequest } from './authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register/trainer')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedResponse({ description: 'Coach account created.' })
  @ApiConflictResponse({ description: 'Email already in use.' })
  async registerTrainer(
    @Body() input: RegisterCoachDto,
    @Req() request: Request
  ) {
    try {
      return await this.auth.registerTrainer(
        input.fullName,
        input.email,
        input.password,
        input.passwordConfirmation,
        request.ip,
        request.get('user-agent')
      );
    } catch (error) {
      if (error instanceof EmailAlreadyInUseError) {
        throw new ConflictException('Email already in use.');
      }
      if (error instanceof PasswordMismatchError) {
        throw new BadRequestException('Password confirmation does not match.');
      }
      throw error;
    }
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() input: VerifyEmailDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      return this.respondWithSession(
        await this.auth.verifyEmail(
          input.email,
          input.code,
          request.ip,
          request.get('user-agent')
        ),
        response
      );
    } catch (error) {
      if (error instanceof InvalidVerificationCodeError) {
        throw new BadRequestException('Invalid or expired verification code.');
      }
      throw error;
    }
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@Body() input: EmailDto, @Req() request: Request) {
    await this.auth.resendVerificationCode(
      input.email,
      request.ip,
      request.get('user-agent')
    );
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Authenticated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      return this.respondWithSession(
        await this.auth.login(
          input.email,
          input.password,
          request.ip,
          request.get('user-agent')
        ),
        response
      );
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid credentials.');
      }
      if (error instanceof EmailNotVerifiedError) {
        throw new UnauthorizedException('Email verification required.');
      }
      if (error instanceof AccountInactiveError) {
        throw new ForbiddenException('Conta indisponivel. Entre em contato com seu treinador.');
      }
      if (error instanceof AccountLockedError) {
        throw new ForbiddenException('Account is temporarily locked.');
      }
      if (error instanceof TemporaryPasswordExpiredError) {
        throw new UnauthorizedException('Temporary password is expired or already used.');
      }
      throw error;
    }
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() input: EmailDto, @Req() request: Request) {
    await this.auth.forgotPassword(input.email, request.ip, request.get('user-agent'));
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() input: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      return this.respondWithSession(
        await this.auth.changePassword(
          request.user.id,
          input.currentPassword,
          input.newPassword,
          input.passwordConfirmation,
          request.ip,
          request.get('user-agent')
        ),
        response
      );
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Current password is invalid.');
      }
      if (error instanceof PasswordMismatchError) {
        throw new BadRequestException('Password confirmation does not match.');
      }
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      return this.respondWithSession(await this.auth.refresh(request.cookies?.refresh_token), response);
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        this.clearSessionCookies(response);
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.refresh_token);
    this.clearSessionCookies(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Get('trainer-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  trainerOnly(@Req() request: AuthenticatedRequest) {
    return {
      authorized: true,
      user: request.user
    };
  }

  private respondWithSession(result: AuthResult, response: Response) {
    const secure = process.env.NODE_ENV === 'production';
    response.cookie('access_token', result.tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 15 * 60 * 1000,
      path: '/'
    });
    response.cookie('refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      expires: result.tokens.refreshExpiresAt,
      path: '/auth'
    });

    return { user: result.user };
  }

  private clearSessionCookies(response: Response) {
    response.clearCookie('access_token', { path: '/' });
    response.clearCookie('refresh_token', { path: '/auth' });
  }
}
