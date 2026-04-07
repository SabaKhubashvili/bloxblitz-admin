import { Injectable } from '@nestjs/common';
import { CoinflipFraudRedisRepository } from '../infrastructure/coinflip-fraud.redis-repository';
import {
  CLUSTER_BFS_MAX_NODES,
  CLUSTER_SEED_MIN_ENCOUNTERS,
  MONEY_FLOW_MIN_CENTS,
} from '../domain/coinflip-fraud.thresholds';
import { CoinflipFraudScoringService } from './coinflip-fraud-scoring.service';
import { CoinflipFraudReason } from '../domain/coinflip-fraud.reasons';

/**
 * Periodic dense-pair + circulation pass. Bounded BFS to avoid O(N²) blowups.
 */
@Injectable()
export class CoinflipFraudGraphAnalysisService {
  constructor(
    private readonly redis: CoinflipFraudRedisRepository,
    private readonly scoring: CoinflipFraudScoringService,
  ) {}

  async runMoneyFlowAndClusterPass(): Promise<void> {
    const pairs = await this.redis.loadActivePairsIndex(400);
    const seeds = pairs.filter((p) => p.encounters >= CLUSTER_SEED_MIN_ENCOUNTERS);
    const adj = new Map<string, Set<string>>();

    for (const p of seeds) {
      const flowsA = await this.redis.loadOutgoingFlows(p.a, 8);
      const flowsB = await this.redis.loadOutgoingFlows(p.b, 8);
      for (const e of flowsA) {
        if (e.cents < MONEY_FLOW_MIN_CENTS) continue;
        this.addEdge(adj, p.a, e.to);
      }
      for (const e of flowsB) {
        if (e.cents < MONEY_FLOW_MIN_CENTS) continue;
        this.addEdge(adj, p.b, e.to);
      }
      this.addEdge(adj, p.a, p.b);
    }

    const visitedClusters = new Set<string>();
    for (const p of seeds) {
      const members = this.bfsComponent(adj, p.a, CLUSTER_BFS_MAX_NODES);
      if (members.length < 3) continue;
      const id = [...members].sort().join('|').slice(0, 200);
      if (visitedClusters.has(id)) continue;
      visitedClusters.add(id);

      await this.redis.writeClusterScratch(
        `ring-${id.slice(0, 32)}`,
        members,
      );

      for (const u of members) {
        await this.applyClusterBoost(u, members);
      }
    }

  }

  private addEdge(g: Map<string, Set<string>>, a: string, b: string): void {
    if (a === b) return;
    if (!g.has(a)) g.set(a, new Set());
    if (!g.has(b)) g.set(b, new Set());
    g.get(a)!.add(b);
    g.get(b)!.add(a);
  }

  private bfsComponent(
    g: Map<string, Set<string>>,
    start: string,
    maxNodes: number,
  ): string[] {
    const out: string[] = [];
    const q: string[] = [start];
    const seen = new Set<string>([start]);
    while (q.length && out.length < maxNodes) {
      const cur = q.shift()!;
      out.push(cur);
      for (const n of g.get(cur) ?? []) {
        if (!seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
      }
    }
    return out;
  }

  /**
   * Adds a slow-decaying graph signal — always layered on top of per-game checks.
   */
  private async applyClusterBoost(
    username: string,
    members: string[],
  ): Promise<void> {
    const snap = await this.redis.loadUserSnapshot(username);
    const games = snap?.stats.games ?? 0;
    const prior = await this.redis.readUserRiskState(username);
    const hit = {
      reason: CoinflipFraudReason.MULTI_ACCOUNT_GRAPH_CLUSTER,
      family: 'identity' as const,
      weight: Math.min(22, 8 + Math.min(members.length, 12)),
      detail: `Cluster of ${members.length} densely linked coinflip accounts`,
      tempShare: 0.25,
    };
    const computed = this.scoring.compute({ hits: [hit], gamesPlayed: games });
    const mergedPers = (prior?.persistentScore ?? 0) * 0.8 + computed.persistentScore * 0.55;
    const mergedTemp = (prior?.temporaryScore ?? 0) * 0.9 + computed.temporaryScore * 0.35;
    let score = Math.min(100, mergedTemp + mergedPers);
    await this.redis.writeUserRiskState(username, {
      score,
      temporaryScore: mergedTemp,
      persistentScore: mergedPers,
      confidence: Math.max(prior?.confidence ?? 0, computed.confidence * 0.9),
      tier:
        score >= 75
          ? 'critical'
          : score >= 50
            ? 'limited'
            : score >= 25
              ? 'flagged'
              : 'clean',
      reasons: [
        ...new Set([
          ...(prior?.reasons ?? []),
          CoinflipFraudReason.MULTI_ACCOUNT_GRAPH_CLUSTER,
        ]),
      ],
      updatedAtMs: Date.now(),
    });
  }
}
