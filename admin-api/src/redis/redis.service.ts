import { existsSync } from 'node:fs';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

function resolveRedisUrl(config: ConfigService): string | undefined {
  const direct = config.get<string>('REDIS_URL')?.trim();
  if (direct) return direct;

  const configuredHost = config.get<string>('REDIS_HOST')?.trim();
  const host =
    configuredHost ||
    (existsSync('/.dockerenv') ? 'redis' : '127.0.0.1');

  const portRaw = config.get<string>('REDIS_PORT')?.trim();
  const port = portRaw && /^\d+$/.test(portRaw) ? portRaw : '6379';

  const password = config.get<string>('REDIS_PASSWORD')?.trim();
  if (password) {
    return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

function redisConnectSummary(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname || '(no host)';
    const port = u.port || '6379';
    return `${host}:${port}`;
  } catch {
    return '(invalid REDIS_URL)';
  }
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = resolveRedisUrl(this.config);
    if (!url) {
      this.log.warn(
        'Redis disabled: set REDIS_URL or REDIS_HOST (optional REDIS_PORT, REDIS_PASSWORD).',
      );
      return;
    }

    this.log.log(`Redis: connecting to ${redisConnectSummary(url)}…`);

    let redis: Redis | undefined;
    try {
      redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
      redis.on('error', (err) => {
        this.log.warn(`Redis client error: ${err.message}`);
      });
      await redis.connect();
      await redis.ping();
      this.client = redis;
      this.log.log('Redis connected.');
    } catch (e) {
      this.log.error(
        `Redis connection failed: ${e instanceof Error ? e.message : e}`,
      );
      if (redis) {
        redis.removeAllListeners('error');
        redis.disconnect();
      }
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.client.removeAllListeners('error');
      await this.client.quit().catch(() => {});
      this.client = null;
    }
  }

  /** Shared client; null if Redis was not configured or connection failed at startup. */
  getClient(): Redis | null {
    return this.client;
  }
}
