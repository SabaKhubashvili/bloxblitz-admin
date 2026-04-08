import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { LoginUseCase } from './application/login.use-case';
import { VerifyTwoFactorUseCase } from './application/verify-two-factor.use-case';
import { ResendTwoFactorUseCase } from './application/resend-two-factor.use-case';
import type { IAuthAttemptLogger } from './domain/auth-attempt-logger';
import type { IOtpHasher } from './domain/otp-hasher';
import type { IPasswordVerifier } from './domain/password-verifier';
import type { IStaffAuthRepository } from './domain/staff-auth.repository';
import type { ITokenIssuer } from './domain/token-issuer';
import type { ITwoFactorChallengeRepository } from './domain/two-factor-challenge.repository';
import type { ITwoFactorCodeGenerator } from './domain/two-factor-code.generator';
import type { ITwoFactorMailer } from './domain/two-factor-mailer';
import { BcryptOtpHasher } from './infrastructure/bcrypt-otp.hasher';
import { BcryptPasswordVerifier } from './infrastructure/bcrypt-password.verifier';
import {
  AUTH_ATTEMPT_LOGGER,
  OTP_HASHER,
  PASSWORD_VERIFIER,
  STAFF_AUTH_REPOSITORY,
  TOKEN_ISSUER,
  TWO_FACTOR_CHALLENGE_REPOSITORY,
  TWO_FACTOR_CODE_GENERATOR,
  TWO_FACTOR_MAILER,
} from './infrastructure/auth.tokens';
import { JwtTokenIssuer } from './infrastructure/jwt-token.issuer';
import { NestAuthAttemptLogger } from './infrastructure/nest-auth-attempt.logger';
import { BrevoApiTwoFactorMailer } from './infrastructure/brevo-api-two-factor.mailer';
import { PrismaStaffAuthRepository } from './infrastructure/prisma-staff-auth.repository';
import { PrismaTwoFactorChallengeRepository } from './infrastructure/prisma-two-factor-challenge.repository';
import { SecureSixDigitCodeGenerator } from './infrastructure/secure-six-digit-code.generator';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { JwtStrategy } from './presentation/jwt.strategy';

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {},
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PrismaStaffAuthRepository,
    PrismaTwoFactorChallengeRepository,
    BcryptPasswordVerifier,
    BcryptOtpHasher,
    SecureSixDigitCodeGenerator,
    JwtTokenIssuer,
    NestAuthAttemptLogger,
    BrevoApiTwoFactorMailer,
    { provide: STAFF_AUTH_REPOSITORY, useExisting: PrismaStaffAuthRepository },
    {
      provide: TWO_FACTOR_CHALLENGE_REPOSITORY,
      useExisting: PrismaTwoFactorChallengeRepository,
    },
    { provide: PASSWORD_VERIFIER, useExisting: BcryptPasswordVerifier },
    { provide: OTP_HASHER, useExisting: BcryptOtpHasher },
    {
      provide: TWO_FACTOR_CODE_GENERATOR,
      useExisting: SecureSixDigitCodeGenerator,
    },
    { provide: TOKEN_ISSUER, useExisting: JwtTokenIssuer },
    { provide: AUTH_ATTEMPT_LOGGER, useExisting: NestAuthAttemptLogger },
    { provide: TWO_FACTOR_MAILER, useExisting: BrevoApiTwoFactorMailer },
    {
      provide: LoginUseCase,
      useFactory: (
        staffRepo: IStaffAuthRepository,
        passwordVerifier: IPasswordVerifier,
        challengeRepo: ITwoFactorChallengeRepository,
        otpHasher: IOtpHasher,
        codeGen: ITwoFactorCodeGenerator,
        mailer: ITwoFactorMailer,
        authLogger: IAuthAttemptLogger,
        config: ConfigService,
      ) => {
        const codeTtlMs = parsePositiveInt(
          config.get<string>('TWO_FACTOR_CODE_TTL_MS'),
          300_000,
        );
        return new LoginUseCase(
          staffRepo,
          passwordVerifier,
          challengeRepo,
          otpHasher,
          codeGen,
          mailer,
          authLogger,
          codeTtlMs,
        );
      },
      inject: [
        STAFF_AUTH_REPOSITORY,
        PASSWORD_VERIFIER,
        TWO_FACTOR_CHALLENGE_REPOSITORY,
        OTP_HASHER,
        TWO_FACTOR_CODE_GENERATOR,
        TWO_FACTOR_MAILER,
        AUTH_ATTEMPT_LOGGER,
        ConfigService,
      ],
    },
    {
      provide: VerifyTwoFactorUseCase,
      useFactory: (
        challengeRepo: ITwoFactorChallengeRepository,
        otpHasher: IOtpHasher,
        tokenIssuer: ITokenIssuer,
        staffRepo: IStaffAuthRepository,
        authLogger: IAuthAttemptLogger,
        config: ConfigService,
      ) => {
        const maxAttempts = parsePositiveInt(
          config.get<string>('TWO_FACTOR_MAX_ATTEMPTS'),
          5,
        );
        return new VerifyTwoFactorUseCase(
          challengeRepo,
          otpHasher,
          tokenIssuer,
          staffRepo,
          authLogger,
          maxAttempts,
        );
      },
      inject: [
        TWO_FACTOR_CHALLENGE_REPOSITORY,
        OTP_HASHER,
        TOKEN_ISSUER,
        STAFF_AUTH_REPOSITORY,
        AUTH_ATTEMPT_LOGGER,
        ConfigService,
      ],
    },
    {
      provide: ResendTwoFactorUseCase,
      useFactory: (
        challengeRepo: ITwoFactorChallengeRepository,
        otpHasher: IOtpHasher,
        codeGen: ITwoFactorCodeGenerator,
        mailer: ITwoFactorMailer,
        staffRepo: IStaffAuthRepository,
        config: ConfigService,
      ) => {
        const codeTtlMs = parsePositiveInt(
          config.get<string>('TWO_FACTOR_CODE_TTL_MS'),
          300_000,
        );
        const resendCooldownMs = parsePositiveInt(
          config.get<string>('TWO_FACTOR_RESEND_COOLDOWN_MS'),
          60_000,
        );
        return new ResendTwoFactorUseCase(
          challengeRepo,
          otpHasher,
          codeGen,
          mailer,
          staffRepo,
          codeTtlMs,
          resendCooldownMs,
        );
      },
      inject: [
        TWO_FACTOR_CHALLENGE_REPOSITORY,
        OTP_HASHER,
        TWO_FACTOR_CODE_GENERATOR,
        TWO_FACTOR_MAILER,
        STAFF_AUTH_REPOSITORY,
        ConfigService,
      ],
    },
  ],
  exports: [JwtAuthGuard, JwtModule, PassportModule, RolesGuard],
})
export class AuthModule {}
