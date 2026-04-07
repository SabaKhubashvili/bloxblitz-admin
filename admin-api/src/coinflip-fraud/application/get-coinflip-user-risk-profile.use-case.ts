import { Injectable } from '@nestjs/common';
import { CoinflipFraudRedisRepository } from '../infrastructure/coinflip-fraud.redis-repository';

@Injectable()
export class GetCoinflipUserRiskProfileUseCase {
  constructor(private readonly redis: CoinflipFraudRedisRepository) {}

  async execute(username: string): Promise<{
    username: string;
    riskScore: number;
    temporaryScore: number;
    persistentScore: number;
    confidence: number;
    tier: string;
    reasons: string[];
    stats: {
      games: number;
      wins: number;
      losses: number;
      winRate: number;
      wagered: number;
      payoutTotal: number;
      expWinShare: number;
      expectedNetCents: number;
      actualNetCents: number;
    };
    evRatio: number;
    topOpponents: { opponent: string; count: number }[];
    mitigation: Record<string, string> | null;
  }> {
    const [risk, snap, mitigation] = await Promise.all([
      this.redis.readUserRiskState(username),
      this.redis.loadUserSnapshot(username),
      this.redis.getMitigationFields(username),
    ]);

    const g = snap?.stats.games ?? 0;
    const wr = g > 0 ? snap!.stats.wins / g : 0;
    const evRatio =
      snap && snap.stats.expWinShareCents > 0
        ? snap.stats.payoutCents / snap.stats.expWinShareCents
        : 0;

    return {
      username,
      riskScore: risk?.score ?? 0,
      temporaryScore: risk?.temporaryScore ?? 0,
      persistentScore: risk?.persistentScore ?? 0,
      confidence: risk?.confidence ?? 0,
      tier: risk?.tier ?? 'clean',
      reasons: (risk?.reasons ?? []).map(String),
      stats: {
        games: g,
        wins: snap?.stats.wins ?? 0,
        losses: snap?.stats.losses ?? 0,
        winRate: Math.round(wr * 10000) / 10000,
        wagered: (snap?.stats.wageredCents ?? 0) / 100,
        payoutTotal: (snap?.stats.payoutCents ?? 0) / 100,
        expWinShare: (snap?.stats.expWinShareCents ?? 0) / 100,
        expectedNetCents: snap?.stats.expectedNetCents ?? 0,
        actualNetCents: snap?.stats.actualNetCents ?? 0,
      },
      evRatio: Math.round(evRatio * 1000) / 1000,
      topOpponents: snap?.topOpponents ?? [],
      mitigation,
    };
  }
}
