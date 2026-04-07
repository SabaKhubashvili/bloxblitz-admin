import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RewardCasesCacheInvalidator } from '../infrastructure/reward-cases-cache-invalidator';
import type { ListRewardCasesQueryDto } from '../presentation/dto/list-reward-cases.query.dto';
import type { RewardActivityQueryDto } from '../presentation/dto/activity.query.dto';
import type { RewardOpensQueryDto } from '../presentation/dto/opens.query.dto';
import type { CreateRewardCaseBodyDto } from '../presentation/dto/create-reward-case.body.dto';
import type { UpdateRewardCaseBodyDto } from '../presentation/dto/update-reward-case.body.dto';
import type {
  CreateRewardCaseItemBodyDto,
  UpdateRewardCaseItemBodyDto,
} from '../presentation/dto/reward-case-item.body.dto';

type ActivityRow = {
  id: string;
  eventType: string;
  createdAt: Date;
  userUsername: string;
  quantity: number | null;
  source: string | null;
  itemsReceived: unknown;
  status: string;
  rewardTitle: string;
  rewardSlug: string;
};

@Injectable()
export class RewardCasesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheInvalidator: RewardCasesCacheInvalidator,
  ) {}

  async listDefinitions(query: ListRewardCasesQueryDto) {
    const { page, pageSize, search, status, sort, order } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.RewardCaseDefinitionWhereInput = {};

    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.rewardCaseDefinition.count({ where }),
      this.prisma.rewardCaseDefinition.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take: pageSize,
        include: {
          poolItems: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              petId: true,
              weight: true,
              sortOrder: true,
              variant: true,
              pet: {
                select: { id: true, name: true, image: true, rarity: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        position: r.position,
        imageUrl: r.imageUrl,
        isRakebackCase: r.isRakebackCase,
        milestoneLevel: r.milestoneLevel,
        isActive: r.isActive,
        receivesWagerKeys: r.receivesWagerKeys,
        wagerCoinsPerKey: r.wagerCoinsPerKey,
        wagerKeysMaxPerEvent: r.wagerKeysMaxPerEvent,
        levelUpKeysOverride: r.levelUpKeysOverride,
        xpMilestoneThreshold: r.xpMilestoneThreshold,
        xpMilestoneMaxKeysPerEvent: r.xpMilestoneMaxKeysPerEvent,
        requiredLevel: r.requiredLevel,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        prizes: r.poolItems.map((p) => ({
          id: p.id,
          petId: p.petId,
          weight: p.weight,
          sortOrder: p.sortOrder,
          variant: p.variant,
          pet: p.pet,
        })),
      })),
    };
  }

  async getDefinition(id: string) {
    const row = await this.prisma.rewardCaseDefinition.findUnique({
      where: { id },
      include: {
        poolItems: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            petId: true,
            weight: true,
            sortOrder: true,
            variant: true,
            pet: {
              select: {
                id: true,
                name: true,
                image: true,
                rarity: true,
              },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Reward case not found');
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      position: row.position,
      imageUrl: row.imageUrl,
      isRakebackCase: row.isRakebackCase,
      milestoneLevel: row.milestoneLevel,
      isActive: row.isActive,
      receivesWagerKeys: row.receivesWagerKeys,
      wagerCoinsPerKey: row.wagerCoinsPerKey,
      wagerKeysMaxPerEvent: row.wagerKeysMaxPerEvent,
      levelUpKeysOverride: row.levelUpKeysOverride,
      xpMilestoneThreshold: row.xpMilestoneThreshold,
      xpMilestoneMaxKeysPerEvent: row.xpMilestoneMaxKeysPerEvent,
      requiredLevel: row.requiredLevel,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      prizes: row.poolItems.map((p) => ({
        id: p.id,
        petId: p.petId,
        weight: p.weight,
        sortOrder: p.sortOrder,
        variant: p.variant,
        pet: p.pet,
      })),
    };
  }

  async createDefinition(body: CreateRewardCaseBodyDto) {
    try {
      const row = await this.prisma.rewardCaseDefinition.create({
        data: {
          slug: body.slug,
          title: body.title,
          imageUrl: body.imageUrl,
          position: body.position,
          isRakebackCase: body.isRakebackCase ?? false,
          milestoneLevel: body.milestoneLevel ?? null,
          isActive: body.isActive ?? true,
          receivesWagerKeys: body.receivesWagerKeys ?? false,
          wagerCoinsPerKey: body.wagerCoinsPerKey ?? 100,
          wagerKeysMaxPerEvent: body.wagerKeysMaxPerEvent ?? 10,
          levelUpKeysOverride: body.levelUpKeysOverride ?? null,
          xpMilestoneThreshold: body.xpMilestoneThreshold ?? null,
          xpMilestoneMaxKeysPerEvent: body.xpMilestoneMaxKeysPerEvent ?? 10,
          requiredLevel: body.requiredLevel ?? 0,
        },
      });
      await this.cacheInvalidator.invalidateDefinitions();
      return this.getDefinition(row.id);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Slug already exists');
      }
      throw e;
    }
  }

  async updateDefinition(id: string, body: UpdateRewardCaseBodyDto) {
    await this.ensureDefinition(id);
    const data: Prisma.RewardCaseDefinitionUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.position !== undefined) data.position = body.position;
    if (body.isRakebackCase !== undefined)
      data.isRakebackCase = body.isRakebackCase;
    if (body.milestoneLevel !== undefined)
      data.milestoneLevel = body.milestoneLevel;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.receivesWagerKeys !== undefined)
      data.receivesWagerKeys = body.receivesWagerKeys;
    if (body.wagerCoinsPerKey !== undefined)
      data.wagerCoinsPerKey = body.wagerCoinsPerKey;
    if (body.wagerKeysMaxPerEvent !== undefined)
      data.wagerKeysMaxPerEvent = body.wagerKeysMaxPerEvent;
    if (body.levelUpKeysOverride !== undefined)
      data.levelUpKeysOverride = body.levelUpKeysOverride;
    if (body.xpMilestoneThreshold !== undefined)
      data.xpMilestoneThreshold = body.xpMilestoneThreshold;
    if (body.xpMilestoneMaxKeysPerEvent !== undefined)
      data.xpMilestoneMaxKeysPerEvent = body.xpMilestoneMaxKeysPerEvent;
    if (body.requiredLevel !== undefined)
      data.requiredLevel = body.requiredLevel;

    await this.prisma.rewardCaseDefinition.update({
      where: { id },
      data,
    });
    await this.cacheInvalidator.invalidateDefinitions();
    return this.getDefinition(id);
  }

  async deleteDefinition(id: string) {
    await this.ensureDefinition(id);
    const [keys, opens] = await Promise.all([
      this.prisma.userKey.count({ where: { rewardCaseId: id } }),
      this.prisma.rewardCaseOpen.count({ where: { rewardCaseId: id } }),
    ]);
    if (keys > 0 || opens > 0) {
      throw new ConflictException(
        'Cannot delete: users have key ledger rows or opens for this reward case. Deactivate it instead.',
      );
    }
    await this.prisma.rewardCaseDefinition.delete({ where: { id } });
    await this.cacheInvalidator.invalidateDefinitions();
    return { ok: true };
  }

  async addPoolItem(rewardCaseId: string, body: CreateRewardCaseItemBodyDto) {
    await this.ensureDefinition(rewardCaseId);
    await this.ensurePet(body.petId);
    const item = await this.prisma.rewardCaseItem.create({
      data: {
        rewardCaseId,
        petId: body.petId,
        weight: body.weight,
        sortOrder: body.sortOrder ?? 0,
        variant: body.variant ?? [],
      },
    });
    await this.cacheInvalidator.invalidateDefinitions();
    return item;
  }

  async updatePoolItem(
    rewardCaseId: string,
    itemId: string,
    body: UpdateRewardCaseItemBodyDto,
  ) {
    const item = await this.prisma.rewardCaseItem.findFirst({
      where: { id: itemId, rewardCaseId },
    });
    if (!item) throw new NotFoundException('Pool item not found');
    if (body.petId != null) await this.ensurePet(body.petId);
    const data: Prisma.RewardCaseItemUpdateInput = {};
    if (body.petId !== undefined) data.pet = { connect: { id: body.petId } };
    if (body.weight !== undefined) data.weight = body.weight;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.variant !== undefined) data.variant = body.variant;
    const result = await this.prisma.rewardCaseItem.update({
      where: { id: itemId },
      data,
      include: {
        pet: { select: { id: true, name: true, image: true, rarity: true } },
      },
    });
    await this.cacheInvalidator.invalidateDefinitions();
    return result;
  }

  async deletePoolItem(rewardCaseId: string, itemId: string) {
    const item = await this.prisma.rewardCaseItem.findFirst({
      where: { id: itemId, rewardCaseId },
    });
    if (!item) throw new NotFoundException('Pool item not found');
    await this.prisma.rewardCaseItem.delete({ where: { id: itemId } });
    await this.cacheInvalidator.invalidateDefinitions();
    return { ok: true };
  }

  async listOpens(query: RewardOpensQueryDto) {
    const { page, pageSize, user, rewardCaseId, from, to, sort, order } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.RewardCaseOpenWhereInput = {};
    if (user?.trim()) {
      where.userUsername = {
        contains: user.trim(),
        mode: 'insensitive',
      };
    }
    if (rewardCaseId) where.rewardCaseId = rewardCaseId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const orderBy =
      sort === 'userUsername' ? { userUsername: order } : { createdAt: order };

    const [total, rows] = await Promise.all([
      this.prisma.rewardCaseOpen.count({ where }),
      this.prisma.rewardCaseOpen.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          case: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        id: r.id,
        userUsername: r.userUsername,
        createdAt: r.createdAt.toISOString(),
        rewardCase: r.case,
        prizes: normalizeItemsReceived(r.itemsReceived),
      })),
    };
  }

  async listActivity(query: RewardActivityQueryDto) {
    const { page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const userFilter = query.user?.trim()
      ? Prisma.sql`AND u."userUsername" ILIKE ${'%' + sanitizeLike(query.user.trim()) + '%'}`
      : Prisma.empty;

    const rewardFilter = query.rewardCaseId
      ? Prisma.sql`AND u."rewardCaseId" = ${query.rewardCaseId}`
      : Prisma.empty;

    const fromD = query.from ? new Date(query.from) : null;
    const toD = query.to ? new Date(query.to) : null;
    const dateFrom =
      fromD && !Number.isNaN(fromD.getTime())
        ? Prisma.sql`AND u."createdAt" >= ${fromD}`
        : Prisma.empty;
    const dateTo =
      toD && !Number.isNaN(toD.getTime())
        ? Prisma.sql`AND u."createdAt" <= ${toD}`
        : Prisma.empty;

    const eventCond =
      query.eventType === 'all'
        ? Prisma.empty
        : Prisma.sql`AND u."eventType" = ${query.eventType}`;

    const sortCol =
      query.sort === 'userUsername'
        ? Prisma.raw('u."userUsername"')
        : query.sort === 'eventType'
          ? Prisma.raw('u."eventType"')
          : Prisma.raw('u."createdAt"');
    const sortDir =
      query.order === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');

    const base = Prisma.sql`
      FROM (
        SELECT uk.id::text AS id,
               'KEY_GRANT'::text AS "eventType",
               uk."createdAt",
               uk."userUsername",
               uk."rewardCaseId",
               uk.quantity,
               uk.source::text AS source,
               NULL::jsonb AS "itemsReceived",
               'Unopened'::text AS status
        FROM user_keys uk
        WHERE uk.quantity > 0
        UNION ALL
        SELECT ro.id::text,
               'CASE_OPEN'::text,
               ro."createdAt",
               ro."userUsername",
               ro."rewardCaseId",
               NULL::int,
               NULL::text,
               ro."itemsReceived",
               'Opened'::text
        FROM reward_cases ro
      ) u
      INNER JOIN reward_case_definitions rcd ON rcd.id = u."rewardCaseId"
      WHERE 1 = 1
      ${userFilter}
      ${rewardFilter}
      ${dateFrom}
      ${dateTo}
      ${eventCond}
    `;

    const countRows = await this.prisma.$queryRaw<{ c: bigint }[]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS c ${base}`,
    );
    const total = Number(countRows[0]?.c ?? 0);

    const rows = await this.prisma.$queryRaw<ActivityRow[]>(
      Prisma.sql`
        SELECT u.id,
               u."eventType",
               u."createdAt",
               u."userUsername",
               u.quantity,
               u.source,
               u."itemsReceived",
               u.status,
               rcd.title AS "rewardTitle",
               rcd.slug AS "rewardSlug"
        ${base}
        ORDER BY ${sortCol} ${sortDir}
        LIMIT ${pageSize} OFFSET ${skip}
      `,
    );

    return {
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        createdAt: r.createdAt.toISOString(),
        userUsername: r.userUsername,
        rewardTitle: r.rewardTitle,
        rewardSlug: r.rewardSlug,
        quantity: r.quantity,
        source: r.source,
        status: r.status,
        prizes:
          r.eventType === 'CASE_OPEN'
            ? normalizeItemsReceived(r.itemsReceived)
            : null,
      })),
    };
  }

  private async ensureDefinition(id: string) {
    const x = await this.prisma.rewardCaseDefinition.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!x) throw new NotFoundException('Reward case not found');
  }

  private async ensurePet(petId: number) {
    const p = await this.prisma.pets.findUnique({
      where: { id: petId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException(`Pet ${petId} not found`);
  }
}

function sanitizeLike(s: string): string {
  return s.replace(/[%_\\]/g, '');
}

function normalizeItemsReceived(raw: unknown): Array<{
  rewardCaseItemId?: string;
  petId?: number;
  name?: string;
  image?: string;
  rarity?: string;
  variant?: string[];
  value?: number;
}> {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      return {
        rewardCaseItemId:
          typeof o.rewardCaseItemId === 'string'
            ? o.rewardCaseItemId
            : undefined,
        petId: typeof o.petId === 'number' ? o.petId : undefined,
        name: typeof o.name === 'string' ? o.name : undefined,
        image: typeof o.image === 'string' ? o.image : undefined,
        rarity: typeof o.rarity === 'string' ? o.rarity : undefined,
        variant: Array.isArray(o.variant)
          ? o.variant.map((v) => String(v))
          : undefined,
        value: typeof o.value === 'number' ? o.value : undefined,
      };
    }
    return {};
  });
}
