import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import type { IDiceAnalyticsRepository } from '../domain/dice-analytics.repository.port';
import type { DicePlayerStatsDto } from '../presentation/dto/dice-players.response.dto';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';
import type { DicePlayersQueryDto } from '../presentation/dto/dice-players.query.dto';
import { toDicePlayerStatsDto } from './dice-player-stats.mapper';
import { DICE_PLAYERS_LIST_CACHE_VER_KEY } from '../infrastructure/dice-player-control.redis.service';

const CACHE_PREFIX = 'dice:players:v1:';
const CACHE_TTL_SEC = 420;

@Injectable()
export class GetDicePlayersUseCase {
  private readonly log = new Logger(GetDicePlayersUseCase.name);

  constructor(
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
    private readonly redisManager: RedisService,
  ) {}

  async execute(query: DicePlayersQueryDto): Promise<{
    players: DicePlayerStatsDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));
    const offset = (page - 1) * limit;
    const sort = query.sort ?? 'rolls';
    const order = query.order ?? 'desc';
    const username = query.username;
    const moderationStatus = query.moderationStatus;

    const cacheVer = await this.readListCacheVersion();
    const cacheKey = cacheKeyFor({
      cacheVer,
      username: username ?? '',
      page,
      limit,
      sort,
      order,
      moderationStatus: moderationStatus ?? '',
    });

    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    let result: {
      players: DicePlayerStatsDto[];
      total: number;
      page: number;
      limit: number;
    };
    try {
      const { rows, total } = await this.repo.listDicePlayersAggregates({
        username,
        limit,
        offset,
        sort,
        order,
        moderationStatus,
      });
      result = {
        players: rows.map((r) => toDicePlayerStatsDto(r)),
        total,
        page,
        limit,
      };
    } catch (e) {
      this.log.error(
        `listDicePlayersAggregates failed: ${e instanceof Error ? e.message : e}`,
      );
      throw e;
    }

    await this.writeCache(cacheKey, result);
    return result;
  }

  private async readListCacheVersion(): Promise<string> {
    const redis = this.redisManager.getClient();
    if (!redis) return '0';
    try {
      const v = await redis.get(DICE_PLAYERS_LIST_CACHE_VER_KEY);
      return v ?? '0';
    } catch {
      return '0';
    }
  }

  private async readCache(
    key: string,
  ): Promise<{
    players: DicePlayerStatsDto[];
    total: number;
    page: number;
    limit: number;
  } | null> {
    const redis = this.redisManager.getClient();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as {
        players: DicePlayerStatsDto[];
        total: number;
        page: number;
        limit: number;
      };
    } catch (e) {
      this.log.warn(`dice players cache read failed: ${e}`);
      return null;
    }
  }

  private async writeCache(
    key: string,
    body: {
      players: DicePlayerStatsDto[];
      total: number;
      page: number;
      limit: number;
    },
  ): Promise<void> {
    const redis = this.redisManager.getClient();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(body), 'EX', CACHE_TTL_SEC);
    } catch (e) {
      this.log.warn(`dice players cache write failed: ${e}`);
    }
  }
}

function cacheKeyFor(parts: {
  cacheVer: string;
  username: string;
  page: number;
  limit: number;
  sort: string;
  order: string;
  moderationStatus: string;
}): string {
  const u = parts.username.trim().toLowerCase() || '_all';
  const st = parts.moderationStatus.trim().toLowerCase() || '_any';
  return `${CACHE_PREFIX}cv${parts.cacheVer}:${u}:p${parts.page}:l${parts.limit}:s${parts.sort}:o${parts.order}:m${st}`;
}
