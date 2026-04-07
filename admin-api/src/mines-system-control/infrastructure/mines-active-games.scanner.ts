import { Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../redis/redis.service';
import type { MinesRedisGameBlob } from '../domain/mines-reset-refund.calculator';

const ACTIVE_PTR_PATTERN = 'user:mines:active:*';
const GAME_KEY_PREFIX = 'mines:game:';

export type ActiveMinesScanRow = {
  username: string;
  gameId: string;
  blob: MinesRedisGameBlob | null;
};

@Injectable()
export class MinesActiveGamesScanner {
  constructor(private readonly redisManager: RedisService) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  /**
   * SCAN all active-pointer keys and read game ids (tuned for many concurrent players).
   */
  async scanKeysWithValues(r: Redis): Promise<Map<string, string>> {
    const userToGame = new Map<string, string>();
    let cursor = '0';
    const prefix = 'user:mines:active:';
    do {
      const [next, keys] = await r.scan(
        cursor,
        'MATCH',
        ACTIVE_PTR_PATTERN,
        'COUNT',
        500,
      );
      cursor = next;
      for (const key of keys) {
        if (!key.startsWith(prefix)) continue;
        const username = key.slice(prefix.length);
        if (!username) continue;
        const gameId = await r.get(key);
        if (gameId) userToGame.set(username, gameId);
      }
    } while (cursor !== '0');
    return userToGame;
  }

  async loadGameBlob(gameId: string): Promise<MinesRedisGameBlob | null> {
    const r = this.client();
    if (!r) return null;
    const raw = await r.get(`${GAME_KEY_PREFIX}${gameId}`);
    if (!raw) return null;
    try {
      const o = JSON.parse(raw) as MinesRedisGameBlob;
      if (!o || typeof o.username !== 'string' || typeof o.id !== 'string') {
        return null;
      }
      return o;
    } catch {
      return null;
    }
  }

  /** One row per distinct gameId (dedupes multiple pointers to same game). */
  async listActiveGamesForReset(): Promise<ActiveMinesScanRow[]> {
    const r = this.client();
    if (!r) return [];

    const userToGame = await this.scanKeysWithValues(r);
    const byGame = new Map<string, { username: string; gameId: string }>();
    for (const [username, gameId] of userToGame) {
      if (!byGame.has(gameId)) {
        byGame.set(gameId, { username, gameId });
      }
    }

    const rows: ActiveMinesScanRow[] = [];
    for (const { username, gameId } of byGame.values()) {
      const blob = await this.loadGameBlob(gameId);
      rows.push({ username, gameId, blob });
    }
    return rows;
  }
}
