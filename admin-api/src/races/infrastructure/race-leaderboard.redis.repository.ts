import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { RaceRedisKeys } from './race-redis.keys';
import type { LeaderboardRow } from '../domain/races.repository.port';

@Injectable()
export class RaceLeaderboardRedisRepository {
  private readonly log = new Logger(RaceLeaderboardRedisRepository.name);

  constructor(private readonly redis: RedisService) {}

  async top10FromRedis(raceId: string): Promise<LeaderboardRow[] | null> {
    const client = this.redis.getClient();
    if (!client) return null;
    try {
      const raw = await client.zrevrange(
        RaceRedisKeys.leaderboard(raceId),
        0,
        9,
        'WITHSCORES',
      );
      if (!raw.length) return null;
      const rows: LeaderboardRow[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        const username = raw[i];
        const score = Number(raw[i + 1]);
        if (!username) continue;
        rows.push({
          username,
          wagered: Number.isFinite(score) ? score : 0,
          rank: rows.length + 1,
        });
      }
      return rows.length ? rows : null;
    } catch (e) {
      this.log.warn(`top10FromRedis failed raceId=${raceId}`, e);
      return null;
    }
  }

  async deleteLeaderboard(raceId: string): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    try {
      await client.del(RaceRedisKeys.leaderboard(raceId));
    } catch (e) {
      this.log.warn(`deleteLeaderboard failed raceId=${raceId}`, e);
    }
  }

  /** Align with main API race cache keys (`race-cache.adapter`). */
  async invalidateAmpCompatibleRaceCaches(raceId: string): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    try {
      await client.del(
        'race:current',
        `race:${raceId}:top10`,
        RaceRedisKeys.leaderboard(raceId),
      );
      let cursor = '0';
      const pattern = `race:${raceId}:rank:*`;
      for (let i = 0; i < 50; i += 1) {
        const [next, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200,
        );
        if (keys.length) {
          await client.del(...keys);
        }
        if (String(next) === '0') break;
        cursor = String(next);
      }
    } catch (e) {
      this.log.warn(
        `invalidateAmpCompatibleRaceCaches failed raceId=${raceId}`,
        e,
      );
    }
  }

  async deleteCurrentRaceKeyOnly(): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    try {
      await client.del('race:current');
    } catch (e) {
      this.log.warn('deleteCurrentRaceKeyOnly failed', e);
    }
  }
}
