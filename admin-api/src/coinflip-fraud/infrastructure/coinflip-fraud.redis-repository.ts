import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../redis/redis.service';
import { CoinflipFraudRedisKeys } from './coinflip-fraud.redis-keys';
import type { CoinflipFraudPayoutCompletedPayload } from '../domain/coinflip-fraud.events';
import {
  IDENTITY_SET_CAP,
  PAIR_INDEX_MAX,
  PROCESSED_GAME_TTL_SEC,
  ROLLING_GAMES_CAP,
  SESSION_KEY_TTL_SEC,
  TIMING_SAMPLES_CAP,
  TOP_OPPONENTS_CAP,
} from '../domain/coinflip-fraud.thresholds';
import type { UserRiskHashState } from '../domain/coinflip-fraud.risk.types';
import type { FraudRiskTier } from '../domain/coinflip-fraud.risk.types';

const LUA_APPEND_ROLLING_GAME = `
local zkey = KEYS[1]
local hkey = KEYS[2]
local cap = tonumber(ARGV[9]) or 100
local gameId = ARGV[1]
local ts = tonumber(ARGV[2])
local win = tonumber(ARGV[3])
local sc = tonumber(ARGV[4])
local pc = tonumber(ARGV[5])
local ew = tonumber(ARGV[6])
local en = tonumber(ARGV[7])
local an = tonumber(ARGV[8])
redis.call('ZADD', zkey, ts, gameId)
local n = redis.call('ZCARD', zkey)
if n > cap then
  redis.call('ZREMRANGEBYRANK', zkey, 0, n - cap - 1)
end
redis.call('HINCRBY', hkey, 'g', 1)
if win == 1 then
  redis.call('HINCRBY', hkey, 'w', 1)
else
  redis.call('HINCRBY', hkey, 'l', 1)
end
redis.call('HINCRBY', hkey, 'wc', sc)
redis.call('HINCRBY', hkey, 'pc', pc)
redis.call('HINCRBY', hkey, 'ew', ew)
redis.call('HINCRBY', hkey, 'en', en)
redis.call('HINCRBY', hkey, 'an', an)
redis.call('EXPIRE', zkey, 2592000)
redis.call('EXPIRE', hkey, 2592000)
return 1
`;

export interface ParsedUserStats {
  games: number;
  wins: number;
  losses: number;
  wageredCents: number;
  payoutCents: number;
  expWinShareCents: number;
  expectedNetCents: number;
  actualNetCents: number;
}

export interface UserFraudSnapshot {
  username: string;
  stats: ParsedUserStats;
  joinLatenciesMs: number[];
  readyLatenciesMs: number[];
  topOpponents: { opponent: string; count: number }[];
}

export interface PairFraudSnapshot {
  games: number;
  winsSmallerUser: number;
  winsLargerUser: number;
  netFlowCentsToSmaller: number;
}

@Injectable()
export class CoinflipFraudRedisRepository {
  private readonly log = new Logger(CoinflipFraudRedisRepository.name);

  constructor(private readonly redisManager: RedisService) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  async ensureStreamAndGroup(): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const stream = CoinflipFraudRedisKeys.stream();
    const group = CoinflipFraudRedisKeys.streamGroup();
    try {
      await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('BUSYGROUP')) {
        this.log.warn(`ensureStreamAndGroup: ${msg}`);
      }
    }
  }

  /**
   * Merge session fields for correlation (IP, timings). Short TTL — not authoritative for payouts.
   */
  async mergeGameSession(
    gameId: string,
    fields: Record<string, string>,
  ): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const key = CoinflipFraudRedisKeys.gameSession(gameId);
    const pipe = redis.pipeline();
    pipe.hset(key, fields);
    pipe.expire(key, SESSION_KEY_TTL_SEC);
    await pipe.exec();
  }

  /**
   * Idempotent payout processing guard.
   */
  async tryClaimPayoutProcessed(gameId: string): Promise<boolean> {
    const redis = this.client();
    if (!redis) return false;
    const key = CoinflipFraudRedisKeys.processedGame(gameId);
    const ok = await redis.set(key, '1', 'EX', PROCESSED_GAME_TTL_SEC, 'NX');
    return ok === 'OK';
  }

  stakeToCents(amount: string): number {
    const n = Math.round(Number.parseFloat(amount) * 100);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Atomically updates rolling ZSET + stats, opponent ZSET, stake list, optional pair + flow for PvP.
   */
  async recordHumanUserPayout(args: {
    username: string;
    gameId: string;
    ts: number;
    won: boolean;
    stakeCents: number;
    payoutCents: number;
    expectedWinShareCents: number;
    expectedNetCents: number;
    actualNetCents: number;
    opponent?: string;
    joinLatencyMs?: number;
    readyLatencyMs?: number;
    pair?: {
      smaller: string;
      larger: string;
      winnerIsSmaller: boolean;
    };
  }): Promise<void> {
    const redis = this.client();
    if (!redis) return;

    const gamesKey = CoinflipFraudRedisKeys.userGames(args.username);
    const statsKey = CoinflipFraudRedisKeys.userStats(args.username);

    const rollingMember = `${args.gameId}:${args.username}`;

    await redis.eval(
      LUA_APPEND_ROLLING_GAME,
      2,
      gamesKey,
      statsKey,
      rollingMember,
      String(args.ts),
      args.won ? '1' : '0',
      String(args.stakeCents),
      String(args.payoutCents),
      String(args.expectedWinShareCents),
      String(args.expectedNetCents),
      String(args.actualNetCents),
      String(ROLLING_GAMES_CAP),
    );

    const pipe = redis.pipeline();

    const stakesList = `cf:fraud:user:${args.username}:stakes`;
    pipe.lpush(stakesList, String(args.stakeCents));
    pipe.ltrim(stakesList, 0, 29);
    pipe.expire(stakesList, 2592000);

    if (args.opponent) {
      const oz = CoinflipFraudRedisKeys.userOppZset(args.username);
      pipe.zincrby(oz, 1, args.opponent);
    }

    if (args.joinLatencyMs != null && args.joinLatencyMs >= 0) {
      const lk = CoinflipFraudRedisKeys.userJoinLat(args.username);
      pipe.lpush(lk, String(args.joinLatencyMs));
      pipe.ltrim(lk, 0, TIMING_SAMPLES_CAP - 1);
      pipe.expire(lk, 2592000);
    }

    if (args.readyLatencyMs != null && args.readyLatencyMs >= 0) {
      const rk = CoinflipFraudRedisKeys.userReadyLat(args.username);
      pipe.lpush(rk, String(args.readyLatencyMs));
      pipe.ltrim(rk, 0, TIMING_SAMPLES_CAP - 1);
      pipe.expire(rk, 2592000);
    }

    if (args.pair) {
      const pk = CoinflipFraudRedisKeys.pairStats(args.pair.smaller, args.pair.larger);
      pipe.hincrby(pk, 'n', 1);
      if (args.pair.winnerIsSmaller) {
        pipe.hincrby(pk, 'ws', 1);
      } else {
        pipe.hincrby(pk, 'wl', 1);
      }
      pipe.expire(pk, 2592000);

      const member = `${args.pair.smaller}|${args.pair.larger}`;
      pipe.zincrby(CoinflipFraudRedisKeys.pairIndex(), 1, member);
    }

    await pipe.exec();

    if (args.opponent) {
      await this.trimOpponentZset(redis, args.username);
      await this.trimOpponentZset(redis, args.opponent);
    }
    if (args.pair) {
      await this.trimPairIndex(redis);
    }

  }

  async recordDirectedStakeFlow(
    loser: string,
    winner: string,
    cents: number,
  ): Promise<void> {
    const redis = this.client();
    if (!redis || cents <= 0) return;
    const zkey = `cf:fraud:flow:out:${loser}`;
    await redis.zincrby(zkey, cents, winner);
    const card = await redis.zcard(zkey);
    if (card > 24) {
      const lowest = await redis.zrange(zkey, 0, card - 25);
      if (lowest.length) {
        await redis.zrem(zkey, ...lowest);
      }
    }
    await redis.expire(zkey, 2592000);
  }

  private async trimOpponentZset(redis: Redis, username: string): Promise<void> {
    const oz = CoinflipFraudRedisKeys.userOppZset(username);
    const card = await redis.zcard(oz);
    if (card <= TOP_OPPONENTS_CAP) return;
    await redis.zremrangebyrank(oz, 0, card - TOP_OPPONENTS_CAP - 1);
  }

  private async trimPairIndex(redis: Redis): Promise<void> {
    const ix = CoinflipFraudRedisKeys.pairIndex();
    const card = await redis.zcard(ix);
    if (card <= PAIR_INDEX_MAX) return;
    await redis.zremrangebyrank(ix, 0, card - PAIR_INDEX_MAX - 1);
  }

  async addIdentityUser(
    kind: 'ip' | 'fp',
    digest: string,
    username: string,
  ): Promise<void> {
    const redis = this.client();
    if (!redis || !digest) return;
    const key =
      kind === 'ip'
        ? CoinflipFraudRedisKeys.ipUsers(digest)
        : CoinflipFraudRedisKeys.fpUsers(digest);
    const pipe = redis.pipeline();
    pipe.sadd(key, username);
    pipe.expire(key, 604800);
    await pipe.exec();
    const n = await redis.scard(key);
    if (n > IDENTITY_SET_CAP) {
      const popped = await redis.spop(key, n - IDENTITY_SET_CAP);
      void popped;
    }
  }

  async getIdentityUsers(
    kind: 'ip' | 'fp',
    digest: string,
  ): Promise<string[]> {
    const redis = this.client();
    if (!redis || !digest) return [];
    const key =
      kind === 'ip'
        ? CoinflipFraudRedisKeys.ipUsers(digest)
        : CoinflipFraudRedisKeys.fpUsers(digest);
    return redis.smembers(key);
  }

  async loadUserSnapshot(username: string): Promise<UserFraudSnapshot | null> {
    const redis = this.client();
    if (!redis) return null;
    const h = await redis.hgetall(CoinflipFraudRedisKeys.userStats(username));
    if (!h || !h.g) {
      return {
        username,
        stats: {
          games: 0,
          wins: 0,
          losses: 0,
          wageredCents: 0,
          payoutCents: 0,
          expWinShareCents: 0,
          expectedNetCents: 0,
          actualNetCents: 0,
        },
        joinLatenciesMs: [],
        readyLatenciesMs: [],
        topOpponents: [],
      };
    }

    const stats: ParsedUserStats = {
      games: Number(h.g ?? 0),
      wins: Number(h.w ?? 0),
      losses: Number(h.l ?? 0),
      wageredCents: Number(h.wc ?? 0),
      payoutCents: Number(h.pc ?? 0),
      expWinShareCents: Number(h.ew ?? 0),
      expectedNetCents: Number(h.en ?? 0),
      actualNetCents: Number(h.an ?? 0),
    };

    const [joinLat, readyLat, opp] = await Promise.all([
      redis.lrange(CoinflipFraudRedisKeys.userJoinLat(username), 0, -1),
      redis.lrange(CoinflipFraudRedisKeys.userReadyLat(username), 0, -1),
      redis.zrevrange(
        CoinflipFraudRedisKeys.userOppZset(username),
        0,
        TOP_OPPONENTS_CAP - 1,
        'WITHSCORES',
      ),
    ]);

    const topOpponents: { opponent: string; count: number }[] = [];
    for (let i = 0; i < opp.length; i += 2) {
      topOpponents.push({
        opponent: opp[i]!,
        count: Number(opp[i + 1] ?? 0),
      });
    }

    return {
      username,
      stats,
      joinLatenciesMs: joinLat.map((x) => Number(x)),
      readyLatenciesMs: readyLat.map((x) => Number(x)),
      topOpponents,
    };
  }

  async loadPairSnapshot(
    userA: string,
    userB: string,
  ): Promise<PairFraudSnapshot | null> {
    const redis = this.client();
    if (!redis) return null;
    const [x, y] = userA < userB ? [userA, userB] : [userB, userA];
    const h = await redis.hgetall(CoinflipFraudRedisKeys.pairStats(x, y));
    if (!h || !h.n) {
      return {
        games: 0,
        winsSmallerUser: 0,
        winsLargerUser: 0,
        netFlowCentsToSmaller: 0,
      };
    }
    return {
      games: Number(h.n),
      winsSmallerUser: Number(h.ws ?? 0),
      winsLargerUser: Number(h.wl ?? 0),
      netFlowCentsToSmaller: Number(h.flow ?? 0),
    };
  }

  async updatePairFlowNet(
    smaller: string,
    larger: string,
    netDeltaTowardSmaller: number,
  ): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const pk = CoinflipFraudRedisKeys.pairStats(smaller, larger);
    await redis.hincrby(pk, 'flow', netDeltaTowardSmaller);
    await redis.expire(pk, 2592000);
  }

  async loadStakeHistoryCents(username: string): Promise<number[]> {
    const redis = this.client();
    if (!redis) return [];
    const raw = await redis.lrange(`cf:fraud:user:${username}:stakes`, 0, -1);
    return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  }

  /** Top directed flow edges from a user (for local loop search). */
  async loadOutgoingFlows(
    username: string,
    maxNeighbors: number,
  ): Promise<{ to: string; cents: number }[]> {
    const redis = this.client();
    if (!redis) return [];
    const zkey = `cf:fraud:flow:out:${username}`;
    const raw = await redis.zrevrange(zkey, 0, maxNeighbors - 1, 'WITHSCORES');
    const out: { to: string; cents: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      out.push({ to: raw[i]!, cents: Number(raw[i + 1] ?? 0) });
    }
    return out;
  }

  async loadActivePairsIndex(
    limit: number,
  ): Promise<{ a: string; b: string; encounters: number }[]> {
    const redis = this.client();
    if (!redis) return [];
    const raw = await redis.zrevrange(
      CoinflipFraudRedisKeys.pairIndex(),
      0,
      limit - 1,
      'WITHSCORES',
    );
    const rows: { a: string; b: string; encounters: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const member = raw[i]!;
      const score = Number(raw[i + 1] ?? 0);
      const parts = member.split('|');
      if (parts.length === 2) {
        rows.push({ a: parts[0]!, b: parts[1]!, encounters: score });
      }
    }
    return rows;
  }

  async writeUserRiskState(
    username: string,
    state: UserRiskHashState,
  ): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const key = CoinflipFraudRedisKeys.riskUser(username);
    const pipe = redis.pipeline();
    pipe.hset(key, {
      score: String(Math.round(state.score)),
      temp: String(Math.round(state.temporaryScore)),
      pers: String(Math.round(state.persistentScore)),
      conf: state.confidence.toFixed(4),
      tier: state.tier,
      reasons: JSON.stringify(state.reasons),
      updatedAt: String(state.updatedAtMs),
    });
    pipe.expire(key, 15552000);
    await pipe.exec();

    /** Leaderboard for admin list; score is composite risk (0 = clean). Keeps all profiled users visible when filtering minScore=0. */
    const sus = CoinflipFraudRedisKeys.suspiciousUsers();
    await redis.zadd(sus, state.score, username);
    await redis.zremrangebyrank(sus, 0, -5001);

    const mon = 'cf:fraud:monitored:users';
    if (state.score > 8) {
      await redis.zadd(mon, state.score, username);
      await redis.zremrangebyrank(mon, 0, -3001);
    }
  }

  async readUserRiskState(username: string): Promise<UserRiskHashState | null> {
    const redis = this.client();
    if (!redis) return null;
    const h = await redis.hgetall(CoinflipFraudRedisKeys.riskUser(username));
    if (!h || h.score == null) return null;
    let reasons: UserRiskHashState['reasons'] = [];
    try {
      reasons = JSON.parse(h.reasons ?? '[]');
    } catch {
      reasons = [];
    }
    return {
      score: Number(h.score),
      temporaryScore: Number(h.temp ?? 0),
      persistentScore: Number(h.pers ?? 0),
      confidence: Number(h.conf ?? 0),
      tier: (h.tier as FraudRiskTier) ?? 'clean',
      reasons,
      updatedAtMs: Number(h.updatedAt ?? 0),
    };
  }

  async applyDecayToMonitoredUsers(
    tempDecay: number,
    persDecay: number,
  ): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const mon = 'cf:fraud:monitored:users';
    const users = await redis.zrevrange(mon, 0, 1999);
    const pipe = redis.pipeline();
    for (const u of users) {
      const key = CoinflipFraudRedisKeys.riskUser(u);
      pipe.hgetall(key);
    }
    const rows = await pipe.exec();
    if (!rows) return;

    const pipe2 = redis.pipeline();
    for (let i = 0; i < users.length; i++) {
      const u = users[i]!;
      const reply = rows[i]?.[1] as Record<string, string> | null;
      if (!reply) continue;
      let temp = Math.max(0, Number(reply.temp ?? 0) - tempDecay);
      let pers = Math.max(0, Number(reply.pers ?? 0) - persDecay);
      let score = temp + pers;
      score = Math.min(100, score);
      temp = Math.min(temp, score);
      pers = Math.min(pers, score);
      pipe2.hset(CoinflipFraudRedisKeys.riskUser(u), {
        temp: temp.toFixed(2),
        pers: pers.toFixed(2),
        score: score.toFixed(2),
      });
      if (score < 10) {
        pipe2.zrem(mon, u);
      }
      pipe2.zadd(CoinflipFraudRedisKeys.suspiciousUsers(), score, u);
    }
    await pipe2.exec();
  }

  /**
   * Newest-first game IDs from the rolling games ZSET (`recordHumanUserPayout` stores `gameId:username`).
   */
  async listRecentGameIdsForUser(
    username: string,
    limit: number,
  ): Promise<string[]> {
    const redis = this.client();
    if (!redis) return [];
    const key = CoinflipFraudRedisKeys.userGames(username);
    const n = Math.max(0, Math.min(Math.floor(limit), 500));
    if (n === 0) return [];
    const raw = await redis.zrevrange(key, 0, n - 1);
    const suffix = `:${username}`;
    const out: string[] = [];
    for (const member of raw) {
      if (!member.endsWith(suffix)) continue;
      const gameId = member.slice(0, -suffix.length);
      if (gameId.length) out.push(gameId);
    }
    return out;
  }

  async writeGameRisk(
    gameId: string,
    score: number,
    reasons: string[],
  ): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const key = CoinflipFraudRedisKeys.gameRisk(gameId);
    await redis.hset(key, {
      score: String(Math.round(score)),
      reasons: JSON.stringify(reasons),
      updatedAt: String(Date.now()),
    });
    await redis.expire(key, 15552000);
    if (score >= 15) {
      await redis.zadd(CoinflipFraudRedisKeys.suspiciousGames(), score, gameId);
      await redis.zremrangebyrank(CoinflipFraudRedisKeys.suspiciousGames(), 0, -2001);
    }
  }

  async zrangeSuspiciousUsers(
    min: number,
    max: number,
    offset: number,
    limit: number,
  ): Promise<{ username: string; score: number }[]> {
    const redis = this.client();
    if (!redis) return [];
    const raw = await redis.zrevrangebyscore(
      CoinflipFraudRedisKeys.suspiciousUsers(),
      max,
      min,
      'WITHSCORES',
      'LIMIT',
      offset,
      limit,
    );
    const out: { username: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      out.push({ username: raw[i]!, score: Number(raw[i + 1]) });
    }
    return out;
  }

  async zcountSuspiciousUsers(min: number, max: number): Promise<number> {
    const redis = this.client();
    if (!redis) return 0;
    return redis.zcount(CoinflipFraudRedisKeys.suspiciousUsers(), min, max);
  }

  async zrangeSuspiciousGames(
    min: number,
    max: number,
    offset: number,
    limit: number,
  ): Promise<{ gameId: string; score: number }[]> {
    const redis = this.client();
    if (!redis) return [];
    const raw = await redis.zrevrangebyscore(
      CoinflipFraudRedisKeys.suspiciousGames(),
      max,
      min,
      'WITHSCORES',
      'LIMIT',
      offset,
      limit,
    );
    const out: { gameId: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      out.push({ gameId: raw[i]!, score: Number(raw[i + 1]) });
    }
    return out;
  }

  async zcountSuspiciousGames(min: number, max: number): Promise<number> {
    const redis = this.client();
    if (!redis) return 0;
    return redis.zcount(CoinflipFraudRedisKeys.suspiciousGames(), min, max);
  }

  async readGameRisk(gameId: string): Promise<{
    score: number;
    reasons: string[];
  } | null> {
    const redis = this.client();
    if (!redis) return null;
    const h = await redis.hgetall(CoinflipFraudRedisKeys.gameRisk(gameId));
    if (!h.score) return null;
    try {
      return {
        score: Number(h.score),
        reasons: JSON.parse(h.reasons ?? '[]'),
      };
    } catch {
      return { score: Number(h.score), reasons: [] };
    }
  }

  async setMitigationFields(
    username: string,
    fields: Record<string, string>,
  ): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const key = CoinflipFraudRedisKeys.mitigation(username);
    const pipe = redis.pipeline();
    pipe.hset(key, fields);
    pipe.expire(key, 15552000);
    await pipe.exec();
  }

  async getMitigationFields(
    username: string,
  ): Promise<Record<string, string> | null> {
    const redis = this.client();
    if (!redis) return null;
    const h = await redis.hgetall(CoinflipFraudRedisKeys.mitigation(username));
    return Object.keys(h).length ? h : null;
  }

  async clearUserRiskData(username: string): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const keys = [
      CoinflipFraudRedisKeys.riskUser(username),
      CoinflipFraudRedisKeys.userGames(username),
      CoinflipFraudRedisKeys.userStats(username),
      CoinflipFraudRedisKeys.userOppZset(username),
      CoinflipFraudRedisKeys.userJoinLat(username),
      CoinflipFraudRedisKeys.userReadyLat(username),
      `cf:fraud:user:${username}:stakes`,
      `cf:fraud:flow:out:${username}`,
    ];
    const pipe = redis.pipeline();
    for (const k of keys) {
      pipe.del(k);
    }
    pipe.zrem(CoinflipFraudRedisKeys.suspiciousUsers(), username);
    pipe.zrem('cf:fraud:monitored:users', username);
    await pipe.exec();
  }

  /** Graph clustering scratch — store member list under cluster id. */
  async writeClusterScratch(
    clusterId: string,
    members: string[],
  ): Promise<void> {
    const redis = this.client();
    if (!redis) return;
    const key = CoinflipFraudRedisKeys.clusterMembers(clusterId);
    const pipe = redis.pipeline();
    pipe.del(key);
    if (members.length) {
      pipe.sadd(key, ...members);
    }
    pipe.expire(key, 3600);
    await pipe.exec();
  }

  extractPayoutPrimitives(payload: CoinflipFraudPayoutCompletedPayload): {
    stakeCents: number;
    payoutWinnerCents: number;
    houseEdge: number;
  } {
    const stakeCents = this.stakeToCents(payload.stakeAmount);
    const payoutWinnerCents = this.stakeToCents(payload.payoutToWinner);
    const houseEdge =
      typeof payload.houseEdge === 'number' && Number.isFinite(payload.houseEdge)
        ? Math.min(1, Math.max(0, payload.houseEdge))
        : 0;
    return { stakeCents, payoutWinnerCents, houseEdge };
  }
}
