import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CrashPlayerBetEligibilityService } from '../application/crash-player-bet-eligibility.service';
import { PrefetchCrashEligibilityBodyDto } from './dto/prefetch-crash-eligibility.body.dto';
import { ValidateCrashBetBodyDto } from './dto/validate-crash-bet.body.dto';
import { InternalServiceKeyGuard } from './guards/internal-service-key.guard';

/**
 * Called by the Crash game service before accepting a stake. Configure
 * `INTERNAL_CRASH_VALIDATION_KEY` and send it as header `x-internal-api-key`.
 * Skip all throttlers — high-volume service-to-service traffic.
 */
@SkipThrottle()
@Controller('internal/crash')
@UseGuards(InternalServiceKeyGuard)
export class InternalCrashBetValidationController {
  constructor(
    private readonly eligibility: CrashPlayerBetEligibilityService,
  ) {}

  @Post('validate-bet')
  @HttpCode(HttpStatus.OK)
  async validateBet(@Body() body: ValidateCrashBetBodyDto) {
    await this.eligibility.assertCanPlaceCrashBet(
      body.username.trim(),
      body.betAmount,
    );
    return { ok: true as const };
  }

  /**
   * Non-blocking warm-up of the control-row cache. Returns immediately; safe to call
   * when the user joins the Crash lobby so `validate-bet` does not wait on cold DB.
   */
  @Post('prefetch-eligibility')
  @HttpCode(HttpStatus.OK)
  prefetchEligibility(@Body() body: PrefetchCrashEligibilityBodyDto) {
    this.eligibility.scheduleWarmControlCache(body.username.trim());
    return { ok: true as const };
  }
}
