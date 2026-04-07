import { Inject, Injectable } from '@nestjs/common';
import type { IDiceAnalyticsRepository } from '../domain/dice-analytics.repository.port';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';
import type { RecentDiceGamesResponseDto } from '../presentation/dto/dice-recent-games.response.dto';
import type { DiceRecentGamesQueryDto } from '../presentation/dto/dice-recent-games.query.dto';

const RECENT_DICE_GAMES_LIMIT = 20;

@Injectable()
export class GetRecentDiceGamesUseCase {
  constructor(
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
  ) {}

  async execute(
    query: DiceRecentGamesQueryDto,
  ): Promise<RecentDiceGamesResponseDto> {
    const side = query.side ?? 'all';
    const rows = await this.repo.findRecentDiceGames(
      {
        player: query.player,
        minBet: query.minBet,
        side,
      },
      RECENT_DICE_GAMES_LIMIT,
    );

    const games: RecentDiceGamesResponseDto['games'] = rows.map((r) => ({
      id: r.id,
      player: r.userUsername,
      betAmount: r.betAmount,
      payout: r.payout,
      profit: r.profit,
      roll: r.rollResult,
      target: r.chance,
      side: r.rollMode === 'OVER' ? 'over' : 'under',
      createdAt: r.createdAt.toISOString(),
    }));

    return { games };
  }
}
