import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import {
  COINFLIP_BOT_CONFIG_DEFAULTS,
  type CoinflipBotCacheEntry,
  type CoinflipBotConfigJson,
} from '../domain/coinflip-bot.types';
import { COINFLIP_BOTS_REDIS_KEY } from '../infrastructure/coinflip-bots.redis-key';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function normalizeBotConfig(raw: unknown): CoinflipBotConfigJson {
  const base = { ...COINFLIP_BOT_CONFIG_DEFAULTS };
  if (!isRecord(raw)) return base;
  const g = (key: string): unknown => raw[key];

  const isActive = g('isActive');
  if (typeof isActive === 'boolean') base.isActive = isActive;
  const minBet = g('minBet');
  if (typeof minBet === 'number' && Number.isFinite(minBet))
    base.minBet = Math.max(0.01, minBet);
  const maxBet = g('maxBet');
  if (typeof maxBet === 'number' && Number.isFinite(maxBet))
    base.maxBet = Math.max(base.minBet, maxBet);
  const joinDelayMinMs = g('joinDelayMinMs');
  if (typeof joinDelayMinMs === 'number' && joinDelayMinMs >= 0)
    base.joinDelayMinMs = joinDelayMinMs;
  const joinDelayMaxMs = g('joinDelayMaxMs');
  if (typeof joinDelayMaxMs === 'number' && joinDelayMaxMs >= 0)
    base.joinDelayMaxMs = joinDelayMaxMs;
  if (base.joinDelayMinMs != null && base.joinDelayMaxMs != null) {
    if (base.joinDelayMinMs > base.joinDelayMaxMs) {
      const t = base.joinDelayMinMs;
      base.joinDelayMinMs = base.joinDelayMaxMs;
      base.joinDelayMaxMs = t;
    }
  }
  const bt = g('behaviorTier');
  if (bt === 0 || bt === 1 || bt === 2) base.behaviorTier = bt;
  const selW = g('selectionWeight');
  if (typeof selW === 'number' && selW > 0) base.selectionWeight = selW;
  return base;
}

function userRowToCacheEntry(row: {
  id: string;
  username: string;
  profile_picture: string;
  currentLevel: number;
  botConfig: Prisma.JsonValue | null;
}): CoinflipBotCacheEntry | null {
  if (!row.botConfig) return null;
  const c = normalizeBotConfig(row.botConfig);
  return {
    userId: row.id,
    username: row.username,
    profilePicture: row.profile_picture,
    level: row.currentLevel,
    isBot: true,
    isActive: c.isActive,
    minBet: c.minBet,
    maxBet: c.maxBet,
    joinDelayMinMs: c.joinDelayMinMs ?? COINFLIP_BOT_CONFIG_DEFAULTS.joinDelayMinMs!,
    joinDelayMaxMs: c.joinDelayMaxMs ?? COINFLIP_BOT_CONFIG_DEFAULTS.joinDelayMaxMs!,
    behaviorTier: c.behaviorTier ?? 1,
    selectionWeight: c.selectionWeight ?? 1,
  };
}

export type CreateCoinflipBotInput = {
  username: string;
  profilePicture?: string;
  initialBalance?: number;
  config: Partial<CoinflipBotConfigJson>;
};

export type UpdateCoinflipBotInput = {
  profilePicture?: string;
  config?: Partial<CoinflipBotConfigJson>;
};

@Injectable()
export class CoinflipBotsAdminService {
  private readonly log = new Logger(CoinflipBotsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async syncAllBotsToRedis(): Promise<number> {
    const client = this.redis.getClient();
    const rows = await this.prisma.user.findMany({
      where: { isBot: true },
      select: {
        id: true,
        username: true,
        profile_picture: true,
        currentLevel: true,
        botConfig: true,
      },
    });
    const entries: CoinflipBotCacheEntry[] = [];
    for (const row of rows) {
      const e = userRowToCacheEntry(row);
      if (e) entries.push(e);
    }
    if (!client) {
      this.log.warn('Redis unavailable — coinflip:bots not written');
      return entries.length;
    }
    await client.set(COINFLIP_BOTS_REDIS_KEY, JSON.stringify(entries));
    this.log.log(`coinflip:bots synced ${entries.length} entr(y/ies) from DB`);
    return entries.length;
  }

  async listBotsFromDb() {
    return this.prisma.user.findMany({
      where: { isBot: true },
      select: {
        id: true,
        username: true,
        profile_picture: true,
        balance: true,
        currentLevel: true,
        botConfig: true,
        created_at: true,
      },
      orderBy: { username: 'asc' },
    });
  }

  async createBot(input: CreateCoinflipBotInput) {
    const username = input.username.trim();
    if (username.length < 2) {
      throw new ConflictException('Username too short');
    }
    const exists = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Username already taken');

    const config = normalizeBotConfig({
      ...COINFLIP_BOT_CONFIG_DEFAULTS,
      ...input.config,
    });
    const bal =
      input.initialBalance != null && Number.isFinite(input.initialBalance)
        ? new Prisma.Decimal(Math.max(0, input.initialBalance))
        : new Prisma.Decimal(1_000_000);

    await this.prisma.user.create({
      data: {
        username,
        rblx_id: `bot:${randomUUID()}`,
        profile_picture: input.profilePicture?.trim() || '/images/default.webp',
        client_seed: randomBytes(32).toString('hex'),
        isBot: true,
        botConfig: config as Prisma.InputJsonValue,
        balance: bal,
      },
    });
    await this.syncAllBotsToRedis();
    return { ok: true as const };
  }

  async updateBot(username: string, input: UpdateCoinflipBotInput) {
    const row = await this.prisma.user.findFirst({
      where: { username: username.trim(), isBot: true },
    });
    if (!row) throw new NotFoundException('Bot not found');

    const nextConfig =
      input.config != null
        ? normalizeBotConfig({
            ...normalizeBotConfig(row.botConfig),
            ...input.config,
          })
        : normalizeBotConfig(row.botConfig);

    await this.prisma.user.update({
      where: { id: row.id },
      data: {
        ...(input.profilePicture != null && input.profilePicture.trim().length > 0
          ? { profile_picture: input.profilePicture.trim() }
          : {}),
        botConfig: nextConfig as Prisma.InputJsonValue,
      },
    });
    await this.syncAllBotsToRedis();
    return { ok: true as const };
  }

  async deleteBot(username: string) {
    const row = await this.prisma.user.findFirst({
      where: { username: username.trim(), isBot: true },
    });
    if (!row) throw new NotFoundException('Bot not found');

    await this.prisma.user.update({
      where: { id: row.id },
      data: {
        isBot: false,
        botConfig: Prisma.DbNull,
      },
    });
    await this.syncAllBotsToRedis();
    return { ok: true as const };
  }
}
