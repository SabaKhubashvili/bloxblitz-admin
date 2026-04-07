import { Injectable, Logger } from '@nestjs/common';
import { GameStatus, GameType, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MinesSystemMode } from '../domain/mines-system-state';
import type { MinesRedisGameBlob } from '../domain/mines-reset-refund.calculator';
import {
  currentMultiplierForSnapshot,
  grossCreditForAdminReset,
  netProfitForCancelledGame,
} from '../domain/mines-reset-refund.calculator';
import { MinesAdminRefundRedisService } from '../infrastructure/mines-admin-refund.redis';
import { MinesActiveGamesScanner } from '../infrastructure/mines-active-games.scanner';
import { MinesSystemStateRedisService } from '../infrastructure/mines-system-state.redis.service';
import type {
  ResetActiveMinesGameResultDto,
  ResetActiveMinesSummaryDto,
} from './dto/reset-active-mines.out.dto';

const HISTORY_VER_KEY = (username: string) =>
  `cache:mines:history:${username}:version`;

const CONCURRENCY = 32;

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return out;
}

@Injectable()
export class ResetActiveMinesGamesUseCase {
  private readonly log = new Logger(ResetActiveMinesGamesUseCase.name);

  constructor(
    private readonly minesSystemState: MinesSystemStateRedisService,
    private readonly scanner: MinesActiveGamesScanner,
    private readonly adminRefund: MinesAdminRefundRedisService,
    private readonly prisma: PrismaService,
    private readonly redisManager: RedisService,
  ) {}

  async execute(): Promise<ResetActiveMinesSummaryDto> {
    await this.minesSystemState.write({ mode: MinesSystemMode.PAUSED });
    this.log.log('[AUDIT] mines.reset begin — mode forced PAUSED');

    const rows = await this.scanner.listActiveGamesForReset();
    const results = await mapPool(rows, CONCURRENCY, (row) =>
      this.processOneGame(row),
    );

    const gamesCredited = results.filter((r) => r.credited).length;
    await this.minesSystemState.write({ mode: MinesSystemMode.ACTIVE });

    this.log.log(
      `[AUDIT] mines.reset complete gamesProcessed=${results.length} gamesCredited=${gamesCredited} mode=ACTIVE`,
    );

    return {
      modeAfter: MinesSystemMode.ACTIVE,
      gamesProcessed: results.length,
      gamesCredited,
      games: results,
    };
  }

  private async processOneGame(row: {
    username: string;
    gameId: string;
    blob: MinesRedisGameBlob | null;
  }): Promise<ResetActiveMinesGameResultDto> {
    const { gameId, blob } = row;
    const username = blob?.username ?? row.username;

    const base: ResetActiveMinesGameResultDto = {
      gameId,
      username,
      grossCredit: 0,
      credited: false,
      redisCleaned: false,
      dbUpdated: false,
    };

    if (!blob || blob.status !== 'ACTIVE') {
      const cleaned = await this.cleanupRedisForGame(username, gameId);
      const mult = blob ? currentMultiplierForSnapshot(blob) : 1;
      const dbUpdated = await this.cancelRoundInDb(gameId, username, 0, mult);
      return {
        ...base,
        skippedReason: !blob ? 'MISSING_REDIS_GAME_BLOB' : 'NON_ACTIVE_STATUS',
        redisCleaned: cleaned,
        dbUpdated,
      };
    }

    const grossCredit = grossCreditForAdminReset(blob);
    if (grossCredit <= 0) {
      this.log.warn(
        `[AUDIT] mines.reset skip_credit game=${gameId} user=${username} gross=${grossCredit}`,
      );
      const cleaned = await this.cleanupRedisForGame(username, gameId);
      const mult = currentMultiplierForSnapshot(blob);
      const dbUpdated = await this.cancelRoundInDb(gameId, username, 0, mult);
      return {
        ...base,
        skippedReason: 'ZERO_GROSS',
        redisCleaned: cleaned,
        dbUpdated,
      };
    }

    let refund: { credited: boolean };
    try {
      refund = await this.adminRefund.applyAdminResetCredit(
        username,
        gameId,
        grossCredit,
      );
    } catch (e) {
      this.log.error(
        `mines.reset refund failed game=${gameId} user=${username}`,
        e,
      );
      return {
        ...base,
        grossCredit,
        credited: false,
        skippedReason: 'REFUND_ERROR',
        redisCleaned: false,
        dbUpdated: false,
      };
    }

    const redisCleaned = await this.cleanupRedisForGame(username, gameId);
    const mult = currentMultiplierForSnapshot(blob);
    const profit = netProfitForCancelledGame(blob.betAmount, grossCredit);
    const dbUpdated = await this.cancelRoundInDb(gameId, username, profit, mult);

    await this.bumpHistoryCache(username);

    this.log.log(
      `[AUDIT] mines.reset game=${gameId} user=${username} gross=${grossCredit} credited=${refund.credited}`,
    );

    return {
      gameId,
      username,
      grossCredit,
      credited: refund.credited,
      redisCleaned,
      dbUpdated,
    };
  }

  private async bumpHistoryCache(username: string): Promise<void> {
    const client = this.redisManager.getClient();
    if (!client) return;
    try {
      await client.incr(HISTORY_VER_KEY(username));
    } catch {
      /* best-effort */
    }
  }

  private redisClient(): Redis | null {
    return this.redisManager.getClient();
  }

  private async cleanupRedisForGame(
    username: string,
    gameId: string,
  ): Promise<boolean> {
    const client = this.redisClient();
    if (!client) return false;
    try {
      const ptr = await client.get(`user:mines:active:${username}`);
      const pipe = client.pipeline();
      if (ptr === gameId) {
        pipe.del(`user:mines:active:${username}`);
      }
      pipe.del(`mines:game:${gameId}`);
      await pipe.exec();
      return true;
    } catch (e) {
      this.log.warn(
        `mines.reset redis cleanup failed game=${gameId}: ${
          e instanceof Error ? e.message : e
        }`,
      );
      return false;
    }
  }

  /**
   * Idempotent — only rows still in PLAYING are updated to CANCELLED.
   */
  private async cancelRoundInDb(
    gameId: string,
    username: string,
    profit: number,
    multiplier: number,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const gh = await tx.gameHistory.findFirst({
          where: {
            id: gameId,
            gameType: GameType.MINES,
            username,
          },
        });

        if (gh?.status === GameStatus.PLAYING) {
          await tx.gameHistory.update({
            where: { id: gameId },
            data: {
              status: GameStatus.CANCELLED,
              profit: new Prisma.Decimal(profit),
              multiplier: new Prisma.Decimal(multiplier),
            },
          });
        }

        await tx.minesBetHistory.updateMany({
          where: {
            gameId,
            userUsername: username,
            status: GameStatus.PLAYING,
          },
          data: { status: GameStatus.CANCELLED },
        });
      });
      return true;
    } catch (e) {
      this.log.error(`mines.reset DB cancel failed game=${gameId}`, e);
      return false;
    }
  }
}
