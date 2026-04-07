import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import {
  MinesPlayerControl,
  MinesPlayerControlStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  parseRedisControlHash,
  type MinesRedisControlFields,
} from '../domain/mines-redis-moderation.types';

/** Matches game API — hash fields for `mines:control:{username}`. */
export const MINES_CONTROL_KEY_PREFIX = 'mines:control:';

/** Rolling-hour ZSET used by game API — cleared when moderation row is removed. */
export const MINES_ROLLING_HOUR_KEY_PREFIX = 'mines:rollhr:mines:';

@Injectable()
export class MinesPlayerControlRedisService {
  private readonly log = new Logger(MinesPlayerControlRedisService.name);

  constructor(private readonly redisManager: RedisService) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  controlKey(username: string): string {
    return `${MINES_CONTROL_KEY_PREFIX}${username}`;
  }

  rollingKey(username: string): string {
    return `${MINES_ROLLING_HOUR_KEY_PREFIX}${username}`;
  }

  /**
   * Write moderation state for BANNED or LIMITED. Deletes the key for other statuses.
   */
  async writeFromRow(row: MinesPlayerControl): Promise<void> {
    const r = this.client();
    if (!r) {
      this.log.warn('writeFromRow: Redis unavailable');
      return;
    }
    const key = this.controlKey(row.userUsername);
    if (
      row.status !== MinesPlayerControlStatus.BANNED &&
      row.status !== MinesPlayerControlStatus.LIMITED
    ) {
      await r.del(key);
      return;
    }

    const pipe = r.pipeline();
    this.applyRowToPipeline(pipe, key, row);
    await pipe.exec();
  }

  applyRowToPipeline(
    pipe: ReturnType<Redis['pipeline']>,
    key: string,
    row: MinesPlayerControl,
  ): void {
    if (row.status === MinesPlayerControlStatus.BANNED) {
      pipe.hset(key, 'status', 'BANNED');
      pipe.hdel(key, 'maxBetAmount', 'maxGamesPerHour');
      if (row.note && row.note.length > 0) {
        pipe.hset(key, 'note', row.note.slice(0, 500));
      } else {
        pipe.hdel(key, 'note');
      }
      return;
    }

    pipe.hset(key, 'status', 'LIMITED');
    if (row.maxBetAmount != null) {
      const d = new Prisma.Decimal(row.maxBetAmount);
      if (d.gt(0)) {
        pipe.hset(key, 'maxBetAmount', d.toFixed(2));
      } else {
        pipe.hdel(key, 'maxBetAmount');
      }
    } else {
      pipe.hdel(key, 'maxBetAmount');
    }

    if (row.maxGamesPerHour != null && row.maxGamesPerHour > 0) {
      pipe.hset(key, 'maxGamesPerHour', String(row.maxGamesPerHour));
    } else {
      pipe.hdel(key, 'maxGamesPerHour');
    }

    if (row.note && row.note.length > 0) {
      pipe.hset(key, 'note', row.note.slice(0, 500));
    } else {
      pipe.hdel(key, 'note');
    }
  }

  /** Remove control hash and rolling-hour tracker for this user. */
  async remove(username: string): Promise<void> {
    const r = this.client();
    if (!r) return;
    await r.del(this.controlKey(username), this.rollingKey(username));
  }

  /**
   * Sync Redis with DB for all moderated users; delete orphan `mines:control:*` keys.
   */
  async rebuildFromPersistence(prisma: PrismaService): Promise<void> {
    const r = this.client();
    if (!r) {
      this.log.warn('rebuildFromPersistence: Redis unavailable');
      return;
    }

    const rows = await prisma.minesPlayerControl.findMany({
      where: {
        status: {
          in: [
            MinesPlayerControlStatus.BANNED,
            MinesPlayerControlStatus.LIMITED,
          ],
        },
      },
    });
    const dbUsernames = new Set(rows.map((x) => x.userUsername));

    const existing = await this.scanKeys(r, `${MINES_CONTROL_KEY_PREFIX}*`);
    const pipe = r.pipeline();
    for (const k of existing) {
      const u = k.slice(MINES_CONTROL_KEY_PREFIX.length);
      if (u.length > 0 && !dbUsernames.has(u)) {
        pipe.del(k);
        pipe.del(`${MINES_ROLLING_HOUR_KEY_PREFIX}${u}`);
      }
    }
    await pipe.exec();

    for (const row of rows) {
      const p2 = r.pipeline();
      this.applyRowToPipeline(p2, this.controlKey(row.userUsername), row);
      await p2.exec();
    }

    this.log.log(
      `Mines moderation Redis warmed (${rows.length} row(s); orphan control keys removed).`,
    );
  }

  private async scanKeys(r: Redis, pattern: string): Promise<string[]> {
    const out: string[] = [];
    let cursor = '0';
    do {
      const [next, keys] = await r.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        200,
      );
      cursor = next;
      out.push(...keys);
    } while (cursor !== '0');
    return out;
  }

  /**
   * Batch-read moderation hashes (Redis-first; no DB). Missing/empty key → no entry (ACTIVE).
   */
  async getSnapshotsForUsernames(
    usernames: string[],
  ): Promise<Map<string, MinesRedisControlFields>> {
    const r = this.client();
    const out = new Map<string, MinesRedisControlFields>();
    if (!r || usernames.length === 0) return out;

    const pipe = r.pipeline();
    for (const u of usernames) {
      pipe.hgetall(this.controlKey(u));
    }
    const raw = await pipe.exec();
    if (!raw) return out;

    for (let i = 0; i < usernames.length; i++) {
      const row = raw[i];
      if (!row || row[0]) continue;
      const h = row[1] as Record<string, string>;
      const parsed = parseRedisControlHash(h);
      if (parsed) out.set(usernames[i], parsed);
    }
    return out;
  }

  /**
   * Scan all `mines:control:*` keys and parse hashes — used for status filtering lists.
   */
  async scanAllControlSnapshots(): Promise<
    Map<string, MinesRedisControlFields>
  > {
    const r = this.client();
    const out = new Map<string, MinesRedisControlFields>();
    if (!r) return out;

    const keys = await this.scanKeys(r, `${MINES_CONTROL_KEY_PREFIX}*`);
    const chunk = 80;
    for (let i = 0; i < keys.length; i += chunk) {
      const batch = keys.slice(i, i + chunk);
      const pipe = r.pipeline();
      for (const k of batch) {
        pipe.hgetall(k);
      }
      const part = await pipe.exec();
      if (!part) continue;
      for (let j = 0; j < batch.length; j++) {
        const row = part[j];
        if (!row || row[0]) continue;
        const h = row[1] as Record<string, string>;
        const parsed = parseRedisControlHash(h);
        if (!parsed) continue;
        const u = batch[j].slice(MINES_CONTROL_KEY_PREFIX.length);
        if (u.length > 0) out.set(u, parsed);
      }
    }
    return out;
  }
}
