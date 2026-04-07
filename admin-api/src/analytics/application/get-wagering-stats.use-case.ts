import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { GameType } from '@prisma/client';
import { listWindowBounds } from '../domain/resolve-wagering-windows';
import { PRESET_TO_WINDOW } from '../domain/wagering-time-range';
import type { WageringStatsCriteria } from '../domain/wagering-stats.criteria';
import type { IWageringStatsRepository } from '../domain/wagering-stats.repository';
import type {
  WageringStatsResult,
  WageringWindowSnapshot,
} from '../domain/wagering-stats-snapshot';
import type { WageringWindowKey } from '../domain/wagering-time-range';
import { WAGERING_STATS_REPOSITORY } from '../infrastructure/wagering-stats.tokens';

@Injectable()
export class GetWageringStatsUseCase {
  constructor(
    @Inject(WAGERING_STATS_REPOSITORY)
    private readonly wagering: IWageringStatsRepository,
  ) {}

  async execute(criteria: WageringStatsCriteria): Promise<WageringStatsResult> {
    if (
      criteria.diceRollMode !== undefined &&
      criteria.gameType !== GameType.DICE
    ) {
      throw new BadRequestException(
        'diceRollMode filter requires gameType=DICE',
      );
    }

    const now = new Date();
    const filters = {
      gameType: criteria.gameType,
      diceRollMode: criteria.diceRollMode,
    };

    const appliedFilters = {
      ...(criteria.gameType !== undefined && { gameType: criteria.gameType }),
      ...(criteria.diceRollMode !== undefined && {
        diceRollMode: criteria.diceRollMode,
      }),
    };

    if (criteria.singlePreset !== undefined) {
      const windowKey = PRESET_TO_WINDOW[criteria.singlePreset];
      const [bounds] = listWindowBounds(now, [criteria.singlePreset]);
      const stats = await this.wagering.aggregateWindow(bounds, filters);
      return {
        window: windowKey,
        stats,
        appliedFilters,
      };
    }

    const boundsList = listWindowBounds(now);
    const snapshots = await Promise.all(
      boundsList.map((b) => this.wagering.aggregateWindow(b, filters)),
    );

    const windows = {} as Record<WageringWindowKey, WageringWindowSnapshot>;
    for (let i = 0; i < boundsList.length; i++) {
      windows[boundsList[i].key] = snapshots[i];
    }

    return {
      windows,
      appliedFilters,
    };
  }
}
