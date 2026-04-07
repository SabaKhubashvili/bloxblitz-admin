import { Injectable } from '@nestjs/common';
import { CoinflipFraudRedisRepository } from '../infrastructure/coinflip-fraud.redis-repository';

export type SuspiciousGameRow = {
  gameId: string;
  riskScore: number;
  reasons: string[];
};

@Injectable()
export class GetCoinflipSuspiciousGamesUseCase {
  constructor(private readonly redis: CoinflipFraudRedisRepository) {}

  async execute(args: {
    minScore: number;
    maxScore: number;
    offset: number;
    limit: number;
  }): Promise<{ items: SuspiciousGameRow[]; total: number }> {
    const total = await this.redis.zcountSuspiciousGames(
      args.minScore,
      args.maxScore,
    );
    const slice = await this.redis.zrangeSuspiciousGames(
      args.minScore,
      args.maxScore,
      args.offset,
      args.limit,
    );
    const items: SuspiciousGameRow[] = [];
    for (const row of slice) {
      const detail = await this.redis.readGameRisk(row.gameId);
      items.push({
        gameId: row.gameId,
        riskScore: row.score,
        reasons: detail?.reasons ?? [],
      });
    }
    return { items, total };
  }
}
