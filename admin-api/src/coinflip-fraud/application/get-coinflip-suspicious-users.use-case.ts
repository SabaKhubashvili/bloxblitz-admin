import { Injectable } from '@nestjs/common';
import { CoinflipFraudRedisRepository } from '../infrastructure/coinflip-fraud.redis-repository';

export type SuspiciousUserRow = {
  username: string;
  riskScore: number;
  confidence: number;
  tier: string;
  games: number;
  winRate: number;
  reasons: string[];
};

@Injectable()
export class GetCoinflipSuspiciousUsersUseCase {
  constructor(private readonly redis: CoinflipFraudRedisRepository) {}

  async execute(args: {
    minScore: number;
    maxScore: number;
    offset: number;
    limit: number;
  }): Promise<{ items: SuspiciousUserRow[]; total: number }> {
    const total = await this.redis.zcountSuspiciousUsers(
      args.minScore,
      args.maxScore,
    );
    const slice = await this.redis.zrangeSuspiciousUsers(
      args.minScore,
      args.maxScore,
      args.offset,
      args.limit,
    );

    const items: SuspiciousUserRow[] = [];
    for (const row of slice) {
      const [risk, snap] = await Promise.all([
        this.redis.readUserRiskState(row.username),
        this.redis.loadUserSnapshot(row.username),
      ]);
      const g = snap?.stats.games ?? 0;
      const wr = g > 0 ? (snap!.stats.wins / g) * 100 : 0;
      items.push({
        username: row.username,
        riskScore: row.score,
        confidence: risk?.confidence ?? 0,
        tier: risk?.tier ?? 'clean',
        games: g,
        winRate: Math.round(wr * 100) / 100,
        reasons: (risk?.reasons ?? []).map(String),
      });
    }

    return { items, total };
  }
}
