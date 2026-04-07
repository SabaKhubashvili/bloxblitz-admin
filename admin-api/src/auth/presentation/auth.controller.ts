import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { LoginUseCase } from '../application/login.use-case';
import { VerifyTwoFactorUseCase } from '../application/verify-two-factor.use-case';
import { ResendTwoFactorUseCase } from '../application/resend-two-factor.use-case';
import { LoginRequestDto } from './dto/login-request.dto';
import {
  AuthSessionResponseDto,
  TwoFactorRequiredResponseDto,
} from './dto/two-factor-login-response.dto';
import { VerifyTwoFactorRequestDto } from './dto/verify-two-factor-request.dto';
import { ResendTwoFactorRequestDto } from './dto/resend-two-factor-request.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import type { StaffPrincipal } from './staff-principal';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly verifyTwoFactorUseCase: VerifyTwoFactorUseCase,
    private readonly resendTwoFactorUseCase: ResendTwoFactorUseCase,
  ) {}

  /**
   * Rate limited by named throttler `login` (per IP).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ default: true })
  @Throttle({ login: {} })
  async login(
    @Body() dto: LoginRequestDto,
  ): Promise<TwoFactorRequiredResponseDto> {
    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
    });

    if (!result.success) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    }

    return {
      requiresTwoFactor: true,
      challengeId: result.challengeId,
      expiresIn: result.expiresInSeconds,
      emailMasked: result.emailMasked,
    };
  }

  /**
   * Completes login after email code is verified; returns Bearer token (same as former single-step login).
   */
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ default: true })
  @Throttle({ twoFactor: {} })
  async verifyTwoFactor(
    @Body() dto: VerifyTwoFactorRequestDto,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.verifyTwoFactorUseCase.execute({
      challengeId: dto.challengeId,
      code: dto.code,
    });

    if (!result.success) {
      const message = verifyTwoFactorErrorMessage(result.error);
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: 'Unauthorized',
        code: result.error,
      });
    }

    return {
      accessToken: result.accessToken,
      tokenType: 'Bearer',
      expiresIn: result.expiresInSeconds,
      user: {
        id: result.staff.id,
        email: result.staff.email,
        role: result.staff.role,
      },
    };
  }

  @Post('2fa/resend')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ default: true })
  @Throttle({ twoFactor: {} })
  async resendTwoFactor(@Body() dto: ResendTwoFactorRequestDto): Promise<{
    ok: true;
    expiresIn: number;
  }> {
    const result = await this.resendTwoFactorUseCase.execute({
      challengeId: dto.challengeId,
    });

    if (!result.success) {
      if (result.error === 'COOLDOWN' && result.retryAfterSeconds != null) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Please wait before requesting another code.',
            error: 'Too Many Requests',
            retryAfterSeconds: result.retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const message = resendTwoFactorErrorMessage(result.error);
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: 'Unauthorized',
        code: result.error,
      });
    }

    return { ok: true, expiresIn: result.expiresInSeconds };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle({ login: true, twoFactor: true })
  me(@CurrentStaff() staff: StaffPrincipal): MeResponseDto {
    return {
      id: staff.staffId,
      email: staff.email,
      role: staff.role,
    };
  }
}

function verifyTwoFactorErrorMessage(
  code:
    | 'NOT_FOUND'
    | 'EXPIRED'
    | 'CONSUMED'
    | 'LOCKED_OUT'
    | 'INVALID_CODE',
): string {
  switch (code) {
    case 'LOCKED_OUT':
      return 'Too many failed attempts. Request a new code or sign in again.';
    case 'EXPIRED':
      return 'This code has expired. Sign in again to receive a new one.';
    case 'CONSUMED':
      return 'This code was already used. Sign in again if you need a new session.';
    default:
      return 'Invalid or expired verification code.';
  }
}

function resendTwoFactorErrorMessage(
  code: 'NOT_FOUND' | 'EXPIRED' | 'CONSUMED' | 'COOLDOWN',
): string {
  switch (code) {
    case 'EXPIRED':
      return 'This session has expired. Sign in again.';
    case 'CONSUMED':
      return 'This session is no longer valid. Sign in again.';
    default:
      return 'Cannot resend code for this session.';
  }
}
