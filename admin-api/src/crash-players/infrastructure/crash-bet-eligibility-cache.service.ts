import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrashPlayerControlStatus } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';

const KEY_PREFIX = 'bb:crash:elig:ctrl:';

/** Control-row snapshot; `ACTIVE` + null limits means no DB row (unmoderated). */
export type CachedCrashControlSnapshot = {
  status: CrashPlayerControlStatus;
  maxBetAmount: string | null;
  minSecondsBetweenBets: number | null;
};

@Injectable()
export class CrashBetEligibilityCacheService implements OnModuleDestroy {
  private readonly ttlSec: number;
  private readonly memory = new Map<
    string,
    { expiresAt: number; value: CachedCrashControlSnapshot }
  >();
  private readonly maxMemoryEntries = 8192;

  constructor(
    private readonly config: ConfigService,
    private readonly redisManager: RedisService,
  ) {
    const raw = this.config.get<string>('CRASH_ELIGIBILITY_CONTROL_CACHE_TTL_SEC');
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    this.ttlSec = Number.isFinite(n) && n > 0 ? n : 45;
  }

  async onModuleDestroy(): Promise<void> {
    this.memory.clear();
  }

  async get(username: string): Promise<CachedCrashControlSnapshot | undefined> {
    const key = cacheKey(username);
    const redis = this.redisManager.getClient();
    if (redis) {
      try {
        const raw = await redis.get(key);
        if (raw == null) return undefined;
        try {
          return parseSnapshot(raw);
        } catch {
          return undefined;
        }
      } catch {
        return undefined;
      }
    }
    return this.memoryGet(key);
  }

  async set(username: string, snapshot: CachedCrashControlSnapshot): Promise<void> {
    const key = cacheKey(username);
    const payload = JSON.stringify(snapshot);
    const redis = this.redisManager.getClient();
    if (redis) {
      try {
        await redis.setex(key, this.ttlSec, payload);
        return;
      } catch {
        /* fall through to memory */
      }
    }
    this.memorySet(key, snapshot);
  }

  async invalidate(username: string): Promise<void> {
    const key = cacheKey(username);
    const redis = this.redisManager.getClient();
    if (redis) {
      try {
        await redis.del(key);
      } catch {
        /* ignore */
      }
    }
    this.memory.delete(key);
  }

  private memoryGet(key: string): CachedCrashControlSnapshot | undefined {
    const row = this.memory.get(key);
    if (!row) return undefined;
    if (Date.now() >= row.expiresAt) {
      this.memory.delete(key);
      return undefined;
    }
    return row.value;
  }

  private memorySet(key: string, snapshot: CachedCrashControlSnapshot): void {
    if (this.memory.size >= this.maxMemoryEntries) {
      this.pruneMemory();
    }
    this.memory.set(key, {
      value: snapshot,
      expiresAt: Date.now() + this.ttlSec * 1000,
    });
  }

  private pruneMemory(): void {
    const now = Date.now();
    for (const [k, v] of this.memory) {
      if (v.expiresAt <= now) this.memory.delete(k);
    }
    if (this.memory.size < this.maxMemoryEntries * 0.9) return;
    const drop = Math.ceil(this.memory.size * 0.1);
    let i = 0;
    for (const k of this.memory.keys()) {
      this.memory.delete(k);
      if (++i >= drop) break;
    }
  }
}

function cacheKey(username: string): string {
  return `${KEY_PREFIX}${username}`;
}

function parseSnapshot(raw: string): CachedCrashControlSnapshot {
  const j = JSON.parse(raw) as CachedCrashControlSnapshot;
  return {
    status: j.status,
    maxBetAmount: j.maxBetAmount ?? null,
    minSecondsBetweenBets: j.minSecondsBetweenBets ?? null,
  };
}
