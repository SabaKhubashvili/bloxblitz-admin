import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { StaffPrincipal } from '../auth/presentation/staff-principal';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CHAT_BANS_REDIS_KEY } from './chat-ban.constants';
import type { ChatBanRecord } from './domain/chat-ban-record';
import {
  emptyChatBanInfo,
  type AdminUserChatBanInfo,
} from '../admin-users/domain/admin-user-summary';

function parseBanList(raw: string | null): unknown[] {
  if (raw == null || raw === '') return [];
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function normalizeAndPruneRecords(parsed: unknown[]): ChatBanRecord[] {
  const now = Date.now();
  const active: ChatBanRecord[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.username === 'string' ? o.username.trim() : '';
    if (!name) continue;

    let expiresAt: string | null = null;
    if (o.expiresAt != null && String(o.expiresAt).trim() !== '') {
      expiresAt = String(o.expiresAt);
      if (new Date(expiresAt).getTime() <= now) continue;
    }

    const tsRaw = o.timestamp;
    const timestamp =
      tsRaw instanceof Date
        ? tsRaw.toISOString()
        : typeof tsRaw === 'string' || typeof tsRaw === 'number'
          ? new Date(tsRaw).toISOString()
          : new Date().toISOString();

    active.push({
      username: name,
      timestamp,
      reason:
        typeof o.reason === 'string' ? o.reason : 'No reason provided',
      bannedBy:
        typeof o.bannedBy === 'string' ? o.bannedBy : 'Unknown',
      expiresAt,
    });
  }

  return active;
}

function toSnapshot(rec: ChatBanRecord | undefined): AdminUserChatBanInfo {
  if (!rec) {
    return emptyChatBanInfo();
  }
  const permanent = rec.expiresAt == null || rec.expiresAt === '';
  return {
    banned: true,
    permanent,
    expires_at: permanent ? null : rec.expiresAt,
    banned_at: rec.timestamp,
    banned_by: rec.bannedBy,
    reason: rec.reason,
  };
}

@Injectable()
export class ChatBanService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async resolveUserByIdOrUsername(
    userKey: string,
  ): Promise<{ id: string; username: string }> {
    const key = userKey?.trim();
    if (!key) {
      throw new BadRequestException('User id or username required');
    }

    const byId = await this.prisma.user.findUnique({
      where: { id: key },
      select: { id: true, username: true },
    });
    if (byId) return byId;

    const byUsername = await this.prisma.user.findUnique({
      where: { username: key },
      select: { id: true, username: true },
    });
    if (byUsername) return byUsername;

    throw new NotFoundException('User not found');
  }

  private async mutateBans(
    mutator: (records: ChatBanRecord[]) => ChatBanRecord[],
  ): Promise<ChatBanRecord[]> {
    const client = this.redis.getClient();
    if (!client) {
      throw new ServiceUnavailableException(
        'Redis is not available; cannot update chat bans.',
      );
    }

    for (let attempt = 0; attempt < 24; attempt++) {
      await client.watch(CHAT_BANS_REDIS_KEY);
      try {
        const raw = await client.get(CHAT_BANS_REDIS_KEY);
        const parsed = parseBanList(raw);
        const current = normalizeAndPruneRecords(parsed);
        const next = mutator(current);
        const result = await client
          .multi()
          .set(CHAT_BANS_REDIS_KEY, JSON.stringify(next))
          .exec();
        if (result != null) {
          return next;
        }
      } finally {
        await client.unwatch().catch(() => {});
      }
    }

    throw new ConflictException(
      'Could not update chat bans due to contention; try again.',
    );
  }

  /** Load current list, prune expired, persist if needed (read path). */
  async loadActiveBans(): Promise<ChatBanRecord[]> {
    const client = this.redis.getClient();
    if (!client) {
      return [];
    }
    const raw = await client.get(CHAT_BANS_REDIS_KEY);
    const parsed = parseBanList(raw);
    const active = normalizeAndPruneRecords(parsed);
    if (active.length !== parsed.length) {
      await client.set(CHAT_BANS_REDIS_KEY, JSON.stringify(active));
    }
    return active;
  }

  async getBanStatusForUser(userKey: string): Promise<{
    user: { id: string; username: string };
    chat_ban: AdminUserChatBanInfo;
  }> {
    const user = await this.resolveUserByIdOrUsername(userKey);
    const bans = await this.loadActiveBans();
    const rec = bans.find(
      (b) => b.username.toLowerCase() === user.username.toLowerCase(),
    );
    return { user, chat_ban: toSnapshot(rec) };
  }

  async getBanStatusMapForUsernames(
    usernames: string[],
  ): Promise<Map<string, AdminUserChatBanInfo>> {
    const out = new Map<string, AdminUserChatBanInfo>();
    if (usernames.length === 0) return out;

    const bans = await this.loadActiveBans();
    const lowerMap = new Map(
      bans.map((b) => [b.username.toLowerCase(), b] as const),
    );

    for (const u of usernames) {
      const rec = lowerMap.get(u.toLowerCase());
      out.set(u, toSnapshot(rec));
    }
    return out;
  }

  async banUser(params: {
    userKey: string;
    staff: StaffPrincipal;
    reason: string;
    /** Minutes; null/undefined = permanent */
    durationMinutes?: number | null;
  }): Promise<{
    user: { id: string; username: string };
    chat_ban: AdminUserChatBanInfo;
  }> {
    const reason = params.reason?.trim() ?? '';
    if (!reason) {
      throw new BadRequestException('reason is required');
    }
    if (reason.length > 2000) {
      throw new BadRequestException('reason must be at most 2000 characters');
    }

    const { durationMinutes } = params;
    if (durationMinutes != null) {
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new BadRequestException(
          'durationMinutes must be a positive number when provided',
        );
      }
      if (durationMinutes > 525600) {
        throw new BadRequestException(
          'durationMinutes cannot exceed 525600 (1 year)',
        );
      }
    }

    const user = await this.resolveUserByIdOrUsername(params.userKey);
    const bannedBy = params.staff.username;
    if (!bannedBy) {
      throw new BadRequestException('bannedBy is required');
    }

    await this.mutateBans((records) => {
      const others = records.filter(
        (r) => r.username.toLowerCase() !== user.username.toLowerCase(),
      );
      const existing = records.find(
        (r) => r.username.toLowerCase() === user.username.toLowerCase(),
      );
      if (existing) {
        throw new ConflictException(
          'User already has an active chat ban; unban first or wait for expiry.',
        );
      }

      const now = new Date().toISOString();
      let expiresAt: string | null = null;
      if (durationMinutes != null && durationMinutes > 0) {
        expiresAt = new Date(
          Date.now() + durationMinutes * 60_000,
        ).toISOString();
      }

      others.push({
        username: user.username,
        timestamp: now,
        reason,
        bannedBy,
        expiresAt,
      });
      return others;
    });

    const { chat_ban } = await this.getBanStatusForUser(user.id);
    return { user, chat_ban };
  }

  async unbanUser(userKey: string): Promise<{
    user: { id: string; username: string };
    chat_ban: AdminUserChatBanInfo;
  }> {
    const user = await this.resolveUserByIdOrUsername(userKey);

    await this.mutateBans((records) => {
      const idx = records.findIndex(
        (r) => r.username.toLowerCase() === user.username.toLowerCase(),
      );
      if (idx === -1) {
        throw new NotFoundException('User is not chat-banned');
      }
      const next = [...records];
      next.splice(idx, 1);
      return next;
    });

    return {
      user,
      chat_ban: emptyChatBanInfo(),
    };
  }

  /** Merge chat ban snapshots onto user summaries (same username keys). */
  mergeSummaries<T extends { username: string }>(
    users: T[],
    map: Map<string, AdminUserChatBanInfo>,
  ): Array<T & { chat_ban: AdminUserChatBanInfo }> {
    return users.map((u) => ({
      ...u,
      chat_ban: map.get(u.username) ?? emptyChatBanInfo(),
    }));
  }
}
