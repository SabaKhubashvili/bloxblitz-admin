import { Inject, Injectable } from '@nestjs/common';
import type { ICrashAnalyticsRepository } from '../domain/crash-analytics.repository';
import { CRASH_ANALYTICS_REPOSITORY } from '../infrastructure/crash-analytics.tokens';
import { CrashMultiplierHistoryEntryDto } from '../presentation/dto/crash-control-room.response.dto';

const DEFAULT_LIMIT = 90;

@Injectable()
export class GetCrashMultiplierHistoryUseCase {
  constructor(
    @Inject(CRASH_ANALYTICS_REPOSITORY)
    private readonly repo: ICrashAnalyticsRepository,
  ) {}

  async execute(): Promise<CrashMultiplierHistoryEntryDto[]> {
    const rows = await this.repo.listRecentCrashRounds(DEFAULT_LIMIT);
    return rows.map((r) => CrashMultiplierHistoryEntryDto.fromRow(r));
  }
}
