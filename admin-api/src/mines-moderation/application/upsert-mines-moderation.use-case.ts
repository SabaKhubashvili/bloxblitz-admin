import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MinesPlayerControlStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MinesPlayerControlRedisService } from '../infrastructure/mines-player-control.redis.service';
import type { MinesModerationUpsertBodyDto } from '../presentation/dto/mines-moderation-upsert.body.dto';
import type { MinesModerationRowDto } from './dto/mines-moderation.out.dto';

@Injectable()
export class UpsertMinesModerationUseCase {
  private readonly log = new Logger(UpsertMinesModerationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minesRedis: MinesPlayerControlRedisService,
  ) {}

  async execute(
    username: string,
    body: MinesModerationUpsertBodyDto,
  ): Promise<{ item: MinesModerationRowDto }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (body.status === MinesPlayerControlStatus.ACTIVE) {
      throw new BadRequestException(
        'Use DELETE /moderation/:username to clear moderation (ACTIVE is not stored).',
      );
    }

    if (body.status === MinesPlayerControlStatus.BANNED) {
      const row = await this.prisma.minesPlayerControl.upsert({
        where: { userUsername: username },
        create: {
          userUsername: username,
          status: MinesPlayerControlStatus.BANNED,
          maxBetAmount: null,
          maxGamesPerHour: null,
          note: body.note?.trim().slice(0, 500) || null,
        },
        update: {
          status: MinesPlayerControlStatus.BANNED,
          maxBetAmount: null,
          maxGamesPerHour: null,
          note: body.note?.trim().slice(0, 500) || null,
        },
      });
      await this.minesRedis.writeFromRow(row);
      this.log.log(
        `[AUDIT] mines.moderation.ban userUsername=${username} note=${Boolean(row.note)}`,
      );
      return { item: this.mapRow(row) };
    }

    const existing = await this.prisma.minesPlayerControl.findUnique({
      where: { userUsername: username },
    });

    if (existing?.status === MinesPlayerControlStatus.BANNED) {
      throw new ConflictException(
        'User is banned from Mines; clear moderation before applying limits.',
      );
    }

    const noteOnly =
      body.maxBetAmount === undefined &&
      body.maxGamesPerHour === undefined &&
      body.note !== undefined;

    if (noteOnly) {
      if (existing?.status !== MinesPlayerControlStatus.LIMITED) {
        throw new BadRequestException(
          'Can only update the note when the player already has LIMITED Mines moderation.',
        );
      }
      const row = await this.prisma.minesPlayerControl.update({
        where: { userUsername: username },
        data: { note: body.note?.trim().slice(0, 500) || null },
      });
      await this.minesRedis.writeFromRow(row);
      this.log.log(
        `[AUDIT] mines.moderation.limit_note userUsername=${username}`,
      );
      return { item: this.mapRow(row) };
    }

    const nextBet =
      body.maxBetAmount === undefined
        ? existing?.maxBetAmount ?? null
        : body.maxBetAmount == null || body.maxBetAmount <= 0
          ? null
          : new Prisma.Decimal(Number(body.maxBetAmount).toFixed(2));

    const nextHourly =
      body.maxGamesPerHour === undefined
        ? existing?.maxGamesPerHour ?? null
        : body.maxGamesPerHour == null || body.maxGamesPerHour <= 0
          ? null
          : Math.floor(body.maxGamesPerHour);

    const effectiveBet =
      nextBet != null && new Prisma.Decimal(nextBet).gt(0);
    const effectiveHourly = nextHourly != null && nextHourly > 0;
    if (!effectiveBet && !effectiveHourly) {
      throw new BadRequestException(
        'LIMITED status requires at least one positive cap (maxBetAmount and/or maxGamesPerHour).',
      );
    }

    const row = await this.prisma.minesPlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: MinesPlayerControlStatus.LIMITED,
        maxBetAmount: nextBet,
        maxGamesPerHour: nextHourly,
        note: body.note !== undefined ? body.note?.trim().slice(0, 500) || null : null,
      },
      update: {
        status: MinesPlayerControlStatus.LIMITED,
        maxBetAmount: nextBet,
        maxGamesPerHour: nextHourly,
        ...(body.note !== undefined
          ? { note: body.note?.trim().slice(0, 500) || null }
          : {}),
      },
    });

    await this.minesRedis.writeFromRow(row);
    this.log.log(
      `[AUDIT] mines.moderation.limit userUsername=${username} maxBet=${row.maxBetAmount?.toString() ?? 'null'} max/h=${row.maxGamesPerHour ?? 'null'}`,
    );
    return { item: this.mapRow(row) };
  }

  private mapRow(r: {
    userUsername: string;
    status: MinesPlayerControlStatus;
    maxBetAmount: Prisma.Decimal | null;
    maxGamesPerHour: number | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MinesModerationRowDto {
    return {
      userUsername: r.userUsername,
      status: r.status,
      maxBetAmount:
        r.maxBetAmount == null
          ? null
          : new Prisma.Decimal(r.maxBetAmount).toNumber(),
      maxGamesPerHour: r.maxGamesPerHour,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
