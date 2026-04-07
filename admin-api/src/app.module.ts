import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CasesAnalyticsModule } from './cases-analytics/cases-analytics.module';
import { CasesChartsModule } from './cases-charts/cases-charts.module';
import { CoinflipTrackingModule } from './coinflip-tracking/coinflip-tracking.module';
import { MinesOverviewModule } from './mines-overview/mines-overview.module';
import { MinesModerationModule } from './mines-moderation/mines-moderation.module';
import { MinesSystemControlModule } from './mines-system-control/mines-system-control.module';
import { CoinflipFraudModule } from './coinflip-fraud/coinflip-fraud.module';
import { CoinflipPlayersModule } from './coinflip-players/coinflip-players.module';
import { DiceAnalyticsModule } from './dice-analytics/dice-analytics.module';
import { RacesModule } from './races/races.module';
import { RewardCasesModule } from './reward-cases/reward-cases.module';
import { RewardCaseKeysAdminModule } from './reward-case-keys/reward-case-keys-admin.module';
import { CoinflipBannedUserIdsModule } from './coinflip-banned-user-ids/coinflip-banned-user-ids.module';
import { CasesOverviewModule } from './cases-overview/cases-overview.module';
import { PetsModule } from './pets/pets.module';
import { CrashControlRoomModule } from './crash-control-room/crash-control-room.module';
import { CrashChainAdminModule } from './crash-chain-admin/crash-chain-admin.module';
import { CrashPlayersModule } from './crash-players/crash-players.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { resolveNestEnvFilePaths } from './env-files.util';

const nestEnvFiles = resolveNestEnvFilePaths();
const envFilePath =
  nestEnvFiles.length > 0 ? nestEnvFiles : [join(__dirname, '..', '.env')];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      validate: (config: Record<string, unknown>) => {
        const a = config.JWT_SECRET;
        const b = config.jwt_secret;
        const secret =
          typeof a === 'string' && a.length > 0
            ? a
            : typeof b === 'string' && b.length > 0
              ? b
              : '';
        if (secret.length < 16) {
          throw new Error(
            'JWT_SECRET must be set in the environment and be at least 16 characters.',
          );
        }
        return {
          ...config,
          JWT_SECRET: secret,
          JWT_EXPIRES_IN:
            typeof config.JWT_EXPIRES_IN === 'string' &&
            config.JWT_EXPIRES_IN.length > 0
              ? config.JWT_EXPIRES_IN
              : '15m',
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const loginTtl = Number(config.get('LOGIN_THROTTLE_TTL_MS'));
        const loginLimit = Number(config.get('LOGIN_THROTTLE_LIMIT'));
        const loginBlock = Number(config.get('LOGIN_THROTTLE_BLOCK_MS'));
        const twoFactorTtl = Number(config.get('TWO_FACTOR_THROTTLE_TTL_MS'));
        const twoFactorLimit = Number(config.get('TWO_FACTOR_THROTTLE_LIMIT'));
        const defaultTtl = Number(config.get('ADMIN_API_THROTTLE_TTL_MS'));
        const defaultLimit = Number(config.get('ADMIN_API_THROTTLE_LIMIT'));
        return {
          throttlers: [
            {
              name: 'default',
              ttl:
                Number.isFinite(defaultTtl) && defaultTtl > 0
                  ? defaultTtl
                  : 60_000,
              limit:
                Number.isFinite(defaultLimit) && defaultLimit > 0
                  ? defaultLimit
                  : 10_000,
            },
            {
              name: 'login',
              ttl:
                Number.isFinite(loginTtl) && loginTtl > 0 ? loginTtl : 60_000,
              limit:
                Number.isFinite(loginLimit) && loginLimit > 0 ? loginLimit : 5,
              ...(Number.isFinite(loginBlock) && loginBlock > 0
                ? { blockDuration: loginBlock }
                : {}),
            },
            {
              name: 'twoFactor',
              ttl:
                Number.isFinite(twoFactorTtl) && twoFactorTtl > 0
                  ? twoFactorTtl
                  : 60_000,
              limit:
                Number.isFinite(twoFactorLimit) && twoFactorLimit > 0
                  ? twoFactorLimit
                  : 20,
            },
          ],
        };
      },
    }),
    RedisModule,
    PrismaModule,
    CoinflipBannedUserIdsModule,
    AuthModule,
    AdminUsersModule,
    AnalyticsModule,
    CrashControlRoomModule,
    CrashChainAdminModule,
    CrashPlayersModule,
    CasesOverviewModule,
    CasesAnalyticsModule,
    PetsModule,
    CasesChartsModule,
    CoinflipTrackingModule,
    MinesOverviewModule,
    MinesModerationModule,
    MinesSystemControlModule,
    CoinflipFraudModule,
    CoinflipPlayersModule,
    DiceAnalyticsModule,
    RacesModule,
    RewardCasesModule,
    RewardCaseKeysAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
