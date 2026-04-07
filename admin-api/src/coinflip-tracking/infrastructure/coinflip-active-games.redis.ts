import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../redis/redis.service';
import type {
  CoinflipActiveGameDto,
  CoinflipActiveGameFairnessDto,
  CoinflipActiveGamePlayerDto,
} from '../presentation/dto/coinflip-active-games.response.dto';

/** Matches BloxBlitz_Amp/ws `CoinflipRepository.ACTIVE_GAMES_KEY`. */
const COINFLIP_ACTIVE_GAMES_HASH = 'coinflip:active_games';

/** Matches ws `RedisKeys.user.balance.user(username)` prefix. */
const USER_BALANCE_PREFIX = 'user:balance:';

const DIRTY_SET = 'user:balance:dirty';

export type CancelWaitingGameResult =
  | 'ok'
  | 'not_found'
  | 'already_started'
  | 'invalid_payload';

@Injectable()
export class CoinflipActiveGamesRedisReader {
  private readonly log = new Logger(CoinflipActiveGamesRedisReader.name);

  constructor(private readonly redis: RedisService) {}

  /** Active (in-memory/Redis) lobbies not yet persisted as finished history. */
  async countActiveGames(): Promise<number> {
    const client = this.redis.getClient();
    if (!client) {
      return 0;
    }
    try {
      const n = await client.hlen(COINFLIP_ACTIVE_GAMES_HASH);
      return typeof n === 'number' ? n : 0;
    } catch (e) {
      this.log.warn(
        `coinflip active games HLEN failed: ${e instanceof Error ? e.message : e}`,
      );
      return 0;
    }
  }

  /** All games currently in the ws coinflip Redis hash. */
  async listActiveGames(): Promise<CoinflipActiveGameDto[]> {
    const client = this.redis.getClient();
    if (!client) {
      return [];
    }
    try {
      const all = await client.hgetall(COINFLIP_ACTIVE_GAMES_HASH);
      const games: CoinflipActiveGameDto[] = [];
      for (const [id, json] of Object.entries(all)) {
        const mapped = this.mapRedisEntry(id, json);
        if (mapped) games.push(mapped);
      }
      games.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return games;
    } catch (e) {
      this.log.warn(
        `coinflip active games HGETALL failed: ${e instanceof Error ? e.message : e}`,
      );
      return [];
    }
  }

  /**
   * Cancels a lobby-only game (no player2): refunds creator balance in Redis
   * and removes the hash entry — mirrors ws `coinflip:deleteGame` economics.
   * Does not emit websocket events (players refresh on next socket message).
   */
  async cancelWaitingGame(gameId: string): Promise<CancelWaitingGameResult> {
    const client = this.redis.getClient();
    if (!client) {
      this.log.warn('cancelWaitingGame: Redis unavailable');
      return 'not_found';
    }

    for (let attempt = 0; attempt < 12; attempt++) {
      const res = await this.tryCancelWaitingGameOnce(client, gameId);
      if (res !== 'retry') return res;
    }
    return 'not_found';
  }

  private async tryCancelWaitingGameOnce(
    client: Redis,
    gameId: string,
  ): Promise<CancelWaitingGameResult | 'retry'> {
    await client.watch(COINFLIP_ACTIVE_GAMES_HASH);
    try {
      const raw = await client.hget(COINFLIP_ACTIVE_GAMES_HASH, gameId);
      if (!raw) {
        await client.unwatch();
        return 'not_found';
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        await client.unwatch();
        return 'invalid_payload';
      }

      const g = parsed as {
        player1?: {
          username?: string;
          betAmount?: string;
          profilePicture?: string;
          level?: number;
          side?: string;
          id?: string;
        };
        player2?: unknown;
      };

      if (g.player2 != null) {
        await client.unwatch();
        return 'already_started';
      }

      const username = g.player1?.username;
      const betRaw = g.player1?.betAmount;
      const bet = betRaw != null ? parseFloat(String(betRaw)) : NaN;
      if (!username || !Number.isFinite(bet) || bet < 0) {
        await client.unwatch();
        return 'invalid_payload';
      }

      const amount = Math.round(bet * 100) / 100;
      const balKey = `${USER_BALANCE_PREFIX}${username}`;

      const multi = client.multi();
      multi.hdel(COINFLIP_ACTIVE_GAMES_HASH, gameId);
      multi.incrbyfloat(balKey, amount);
      multi.sadd(DIRTY_SET, username);
      const execResult = await multi.exec();
      if (execResult === null) {
        return 'retry';
      }
      return 'ok';
    } catch (e) {
      try {
        await client.unwatch();
      } catch {
        /* ignore */
      }
      this.log.warn(
        `cancelWaitingGame failed: ${e instanceof Error ? e.message : e}`,
      );
      return 'not_found';
    }
  }

  private mapRedisEntry(
    id: string,
    json: string,
  ): CoinflipActiveGameDto | null {
    try {
      const raw = JSON.parse(json) as Record<string, unknown>;
      const p1 = raw.player1 as Record<string, unknown> | undefined;
      const p2raw = raw.player2 as Record<string, unknown> | undefined;
      if (!p1 || typeof p1.username !== 'string') return null;

      const player1 = this.mapPlayer(p1);
      const player2 =
        p2raw && typeof p2raw.username === 'string'
          ? this.mapPlayer(p2raw)
          : null;

      const w1 = player1.wager;
      const w2 = player2?.wager ?? 0;
      const created =
        typeof raw.createdAt === 'string'
          ? raw.createdAt
          : new Date().toISOString();

      const fairness = this.mapFairness(raw.provablyFair);

      return {
        id,
        player1,
        player2,
        totalWager: Math.round((w1 + w2) * 100) / 100,
        state: player2 ? 'playing' : 'waiting',
        createdAt: created,
        fairness,
      };
    } catch {
      return null;
    }
  }

  private mapPlayer(p: Record<string, unknown>): CoinflipActiveGamePlayerDto {
    const sideRaw = p.side === 'T' || p.side === 'H' ? p.side : 'H';
    const wager = parseFloat(String(p.betAmount ?? '0')) || 0;
    const profilePicture =
      typeof p.profilePicture === 'string' ? p.profilePicture : undefined;
    const level =

        typeof p.level === 'number' && Number.isFinite(p.level)
          ? Math.floor(p.level)
          : undefined;
    const id = typeof p.id === 'string' ? p.id : undefined;
    return {
      username: String(p.username),
      wager: Math.round(wager * 100) / 100,
      side: sideRaw,
      profilePicture,
      level,
      id,
    };
  }

  private mapFairness(
    raw: unknown,
  ): CoinflipActiveGameFairnessDto | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const pf = raw as Record<string, unknown>;
    const hash =
      typeof pf.publicServerSeed === 'string' ? pf.publicServerSeed : '';
    const nonce = pf.nonce != null ? String(pf.nonce) : '';
    if (!hash && !nonce) return undefined;
    const serverSeed =
      typeof pf.serverSeed === 'string' ? pf.serverSeed : undefined;
    const eosBlockNum =

        typeof pf.eosBlockNum === 'number' && Number.isFinite(pf.eosBlockNum)
          ? pf.eosBlockNum
          : undefined;
    const eosBlockId =
      typeof pf.eosBlockId === 'string' ? pf.eosBlockId : undefined;
    return {
      serverSeedHash: hash,
      nonce,
      serverSeed,
      eosBlockNum,
      eosBlockId,
    };
  }
}
