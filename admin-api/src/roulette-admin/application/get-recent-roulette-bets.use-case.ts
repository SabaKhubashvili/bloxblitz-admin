import { Injectable } from '@nestjs/common';
import { PrismaRouletteAnalyticsRepository } from '../infrastructure/prisma-roulette-analytics.repository';

@Injectable()
export class GetRecentRouletteBetsUseCase {
  constructor(private readonly repo: PrismaRouletteAnalyticsRepository) {}

  async execute(query: { limit?: number; player?: string }) {
    const limit = query.limit ?? 25;
    const rows = await this.repo.listRecentBets({
      take: limit,
      username: query.player,
    });
    return {
      bets: rows.map((r) => ({
        id: r.id,
        username: r.username,
        betAmount: r.betAmount,
        profit: r.profit,
        multiplier: r.multiplier,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
