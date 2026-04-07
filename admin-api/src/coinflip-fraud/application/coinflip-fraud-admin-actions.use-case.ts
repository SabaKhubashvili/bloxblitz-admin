import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { CoinflipBannedUserIdsRedisService } from '../../coinflip-banned-user-ids/coinflip-banned-user-ids.redis.service';
import { RedisService } from '../../redis/redis.service';
import { CoinflipFraudRedisRepository } from '../infrastructure/coinflip-fraud.redis-repository';
import { CoinflipFraudRedisKeys } from '../infrastructure/coinflip-fraud.redis-keys';
import { CoinflipFraudReason } from '../domain/coinflip-fraud.reasons';
import { STAFF_FLAG_GAME_LOOKBACK } from '../domain/coinflip-fraud.thresholds';

/** Must match ws `CoinflipRedisService.getBannedUsers` document key. */
const COINFLIP_BANNED_USERS_REDIS_KEY = 'coinflip:config:banned_users';

@Injectable()
export class CoinflipFraudAdminActionsUseCase {
  private readonly log = new Logger(CoinflipFraudAdminActionsUseCase.name);

  constructor(
    private readonly redis: CoinflipFraudRedisRepository,
    private readonly redisManager: RedisService,
    private readonly bannedUserIds: CoinflipBannedUserIdsRedisService,
  ) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  async flagUser(args: {
    username: string;
    note: string;
    staffUser: string;
  }): Promise<{ ok: true; riskScore: number }> {
    const prior = await this.redis.readUserRiskState(args.username);
    const bumpTemp = 12;
    const nextScore = Math.min(
      100,
      (prior?.score ?? 0) + bumpTemp,
    );
    const temp = (prior?.temporaryScore ?? 0) + bumpTemp;
    const reasons = [
      ...new Set([
        ...(prior?.reasons ?? []),
        CoinflipFraudReason.MANUAL_STAFF_FLAG,
      ]),
    ];
    await this.redis.setMitigationFields(args.username, {
      internalFlag: '1',
      flagNote: args.note.slice(0, 2_000),
      flaggedBy: args.staffUser.slice(0, 128),
      flaggedAt: String(Date.now()),
      manual: '1',
    });
    await this.redis.writeUserRiskState(args.username, {
      score: nextScore,
      temporaryScore: temp,
      persistentScore: prior?.persistentScore ?? 0,
      confidence: Math.min(1, (prior?.confidence ?? 0.5) + 0.05),
      tier:
        nextScore >= 75
          ? 'critical'
          : nextScore >= 50
            ? 'limited'
            : nextScore >= 25
              ? 'flagged'
              : 'clean',
      reasons,
      updatedAtMs: Date.now(),
    });

    const gameIds = await this.redis.listRecentGameIdsForUser(
      args.username,
      STAFF_FLAG_GAME_LOOKBACK,
    );
    for (const gameId of gameIds) {
      const gr = await this.redis.readGameRisk(gameId);
      const gameReasons = [
        ...new Set([
          ...(gr?.reasons ?? []).map(String),
          CoinflipFraudReason.MANUAL_STAFF_FLAG,
        ]),
      ];
      const gameScore = Math.min(
        100,
        Math.max(15, gr?.score ?? 0),
      );
      await this.redis.writeGameRisk(gameId, gameScore, gameReasons);
    }

    return { ok: true, riskScore: nextScore };
  }

  async limitUser(args: {
    username: string;
    maxBetScaleBps?: number;
    maxBetCents?: number;
    matchmakingDelayMs?: number;
    staffUser: string;
  }): Promise<{ ok: true }> {
    const fields: Record<string, string> = {
      manual: '1',
      limitedBy: args.staffUser.slice(0, 128),
      limitedAt: String(Date.now()),
    };
    if (args.maxBetScaleBps != null) {
      fields.maxBetScaleBps = String(
        Math.min(10_000, Math.max(100, args.maxBetScaleBps)),
      );
    }
    if (args.maxBetCents != null) {
      fields.maxBetCents = String(Math.max(0, Math.floor(args.maxBetCents)));
    }
    if (args.matchmakingDelayMs != null) {
      fields.matchmakingDelayMs = String(
        Math.min(120_000, Math.max(0, args.matchmakingDelayMs)),
      );
    }
    await this.redis.setMitigationFields(args.username, fields);
    return { ok: true };
  }

  async banUser(args: {
    username: string;
    reason: string;
    untilIso: string;
  }): Promise<{ ok: true }> {
    const r = this.client();
    if (!r) {
      this.log.error('banUser: Redis unavailable');
      throw new Error('Redis unavailable');
    }
    const raw = await r.get(COINFLIP_BANNED_USERS_REDIS_KEY);
    let list: { username: string; reason: string; until: string }[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
    }
    const idx = list.findIndex(
      (x) => x.username.toLowerCase() === args.username.toLowerCase(),
    );
    const entry = {
      username: args.username,
      reason: args.reason.slice(0, 500),
      until: args.untilIso,
    };
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    await r.set(COINFLIP_BANNED_USERS_REDIS_KEY, JSON.stringify(list));
    await this.redis.setMitigationFields(args.username, {
      manual: '1',
      banned: '1',
      banUntil: args.untilIso,
    });
    await this.bannedUserIds.addBannedUsername(args.username);
    return { ok: true };
  }

  async clearUser(args: { username: string }): Promise<{ ok: true }> {
    await this.redis.clearUserRiskData(args.username);
    await rdel(this.client(), CoinflipFraudRedisKeys.mitigation(args.username));
    return { ok: true };
  }
}

async function rdel(r: Redis | null, key: string): Promise<void> {
  if (r) await r.del(key);
}
