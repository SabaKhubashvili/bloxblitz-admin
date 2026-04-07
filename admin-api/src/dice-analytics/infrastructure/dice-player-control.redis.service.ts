import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import {
  DicePlayerControl,
  DicePlayerControlStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

/** Same pattern as mines — game API reads `dice:control:{username}`. */
export const DICE_CONTROL_KEY_PREFIX = 'dice:control:';

export const DICE_PLAYERS_LIST_CACHE_VER_KEY = 'dice:players:cacheVer';

@Injectable()
export class DicePlayerControlRedisService {
  private readonly log = new Logger(DicePlayerControlRedisService.name);

  constructor(private readonly redisManager: RedisService) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  controlKey(username: string): string {
    return `${DICE_CONTROL_KEY_PREFIX}${username}`;
  }

  async bumpPlayersListCache(): Promise<void> {
    const r = this.client();
    if (!r) return;
    try {
      await r.incr(DICE_PLAYERS_LIST_CACHE_VER_KEY);
    } catch (e) {
      this.log.warn(`bumpPlayersListCache failed: ${e}`);
    }
  }

  /**
   * Write moderation for BANNED or LIMITED. Deletes the key for ACTIVE / cleared users.
   */
  async writeFromRow(row: DicePlayerControl): Promise<void> {
    const r = this.client();
    if (!r) {
      this.log.warn('Dice control write: Redis unavailable');
      return;
    }
    const key = this.controlKey(row.userUsername);
    if (
      row.status !== DicePlayerControlStatus.BANNED &&
      row.status !== DicePlayerControlStatus.LIMITED
    ) {
      await r.del(key);
      return;
    }

    const pipe = r.pipeline();
    if (row.status === DicePlayerControlStatus.BANNED) {
      pipe.hset(key, 'status', 'BANNED');
      pipe.hdel(key, 'maxBetAmount');
      if (row.note && row.note.length > 0) {
        pipe.hset(key, 'note', row.note.slice(0, 500));
      } else {
        pipe.hdel(key, 'note');
      }
    } else {
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
      if (row.note && row.note.length > 0) {
        pipe.hset(key, 'note', row.note.slice(0, 500));
      } else {
        pipe.hdel(key, 'note');
      }
    }
    await pipe.exec();
  }

  async remove(username: string): Promise<void> {
    const r = this.client();
    if (!r) return;
    await r.del(this.controlKey(username));
  }

  /**
   * Clears `dice:control:*` without `KEYS` — many hosted Redis tiers block KEYS.
   */
  private async deleteAllControlKeys(r: Redis): Promise<void> {
    const pattern = `${DICE_CONTROL_KEY_PREFIX}*`;
    const toDelete: string[] = [];
    let cursor = '0';
    for (let sweep = 0; sweep < 1000; sweep += 1) {
      const [next, keys] = await r.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      toDelete.push(...keys);
      if (String(next) === '0') break;
      cursor = String(next);
    }
    const chunk = 100;
    for (let i = 0; i < toDelete.length; i += chunk) {
      const slice = toDelete.slice(i, i + chunk);
      if (slice.length > 0) {
        await r.del(...slice);
      }
    }
  }

  async rebuildFromPersistence(prisma: PrismaService): Promise<void> {
    const r = this.client();
    if (!r) {
      this.log.warn('rebuildFromPersistence: Redis unavailable');
      return;
    }

    const rows = await prisma.dicePlayerControl.findMany({
      where: {
        status: {
          in: [
            DicePlayerControlStatus.BANNED,
            DicePlayerControlStatus.LIMITED,
          ],
        },
      },
    });

    await this.deleteAllControlKeys(r);

    for (const row of rows) {
      await this.writeFromRow(row);
    }

    this.log.log(`Dice moderation Redis rebuilt (${rows.length} rows)`);
  }
}
