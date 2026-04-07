import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameType, Prisma } from '@prisma/client';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CrashChainLengthPreset } from './presentation/dto/create-crash-chain.body.dto';

/** Same as `setup-crash-chain.ts` */
export const CRASH_SETUP_PROD_CHAIN_LENGTH = 10_000_000;
export const CRASH_SETUP_TEST_CHAIN_LENGTH = 10_000;
const HOUSE_EDGE = 0.01;
const PRECALCULATE_BATCH = 1000;

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Same algorithm as `setup-crash-chain.ts` `calculateFinalHash` (yields so HTTP stays responsive).
 */
export async function calculateCrashFinalHash(
  serverSeed: string,
  totalRounds: number,
): Promise<string> {
  let currentHash = serverSeed;
  const updateInterval = totalRounds > 100_000 ? 100_000 : 1000;

  for (let i = 0; i < totalRounds; i++) {
    currentHash = sha256Hex(currentHash);
    if (i % updateInterval === 0 && i > 0) {
      await new Promise<void>((r) => setImmediate(r));
    }
  }

  return currentHash;
}

export type CrashDistributionBin = {
  label: string;
  min: number;
  max: number;
  count: number;
};

export type CrashChainStatistics = {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  distribution: CrashDistributionBin[];
};

export type CrashChainListRow = {
  id: string;
  chainId: string;
  gameType: string;
  finalHash: string;
  totalRounds: number;
  currentRound: number;
  isActive: boolean;
  isComplete: boolean;
  clientSeed: string | null;
  clientSeedSetAt: string | null;
  createdAt: string;
  completedAt: string | null;
  serverSeedPreview: string;
  precalculatedRounds: number;
  /** Same as script: only chains with `clientSeed == null` appear in “set client seed” menu. */
  needsClientSeed: boolean;
};

export type CrashChainDetail = CrashChainListRow & {
  serverSeed: string;
};

function calculateStatistics(crashPoints: number[]): CrashChainStatistics {
  const total = crashPoints.length;
  const sum = crashPoints.reduce((a, b) => a + b, 0);
  const average = sum / total;

  const sorted = [...crashPoints].sort((a, b) => a - b);
  const median = sorted[Math.floor(total / 2)] ?? 0;
  const min = sorted[0] ?? 0;
  const max = sorted[total - 1] ?? 0;

  const ranges: CrashDistributionBin[] = [
    { min: 1.0, max: 1.99, label: '1.00-1.99x', count: 0 },
    { min: 2.0, max: 4.99, label: '2.00-4.99x', count: 0 },
    { min: 5.0, max: 9.99, label: '5.00-9.99x', count: 0 },
    { min: 10.0, max: 49.99, label: '10.00-49.99x', count: 0 },
    { min: 50.0, max: 99.99, label: '50.00-99.99x', count: 0 },
    { min: 100.0, max: Infinity, label: '100.00x+', count: 0 },
  ];

  crashPoints.forEach((cp) => {
    for (const range of ranges) {
      if (cp >= range.min && cp <= range.max) {
        range.count++;
        break;
      }
    }
  });

  const variance =
    crashPoints.reduce((acc, cp) => acc + Math.pow(cp - average, 2), 0) /
    total;
  const stdDev = Math.sqrt(variance);

  return {
    total,
    average,
    median,
    min,
    max,
    stdDev,
    distribution: ranges,
  };
}

@Injectable()
export class CrashChainAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listChains(limit = 50): Promise<CrashChainListRow[]> {
    const take = Math.min(Math.max(1, limit), 100);
    const chains = await this.prisma.hashChain.findMany({
      where: { gameType: GameType.CRASH },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        chainId: true,
        gameType: true,
        finalHash: true,
        totalRounds: true,
        currentRound: true,
        isActive: true,
        isComplete: true,
        clientSeed: true,
        clientSeedSetAt: true,
        createdAt: true,
        completedAt: true,
        serverSeed: true,
        _count: { select: { crashRounds: true } },
      },
    });
    return chains.map((c) => this.toListRow(c));
  }

  async getActiveChain(): Promise<CrashChainListRow | null> {
    const c = await this.prisma.hashChain.findFirst({
      where: {
        gameType: GameType.CRASH,
        isActive: true,
        isComplete: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        chainId: true,
        gameType: true,
        finalHash: true,
        totalRounds: true,
        currentRound: true,
        isActive: true,
        isComplete: true,
        clientSeed: true,
        clientSeedSetAt: true,
        createdAt: true,
        completedAt: true,
        serverSeed: true,
        _count: { select: { crashRounds: true } },
      },
    });
    return c ? this.toListRow(c) : null;
  }

  async getChainById(chainId: string): Promise<CrashChainDetail> {
    const c = await this.prisma.hashChain.findUnique({
      where: { chainId },
      select: {
        id: true,
        chainId: true,
        gameType: true,
        finalHash: true,
        totalRounds: true,
        currentRound: true,
        isActive: true,
        isComplete: true,
        clientSeed: true,
        clientSeedSetAt: true,
        createdAt: true,
        completedAt: true,
        serverSeed: true,
        _count: { select: { crashRounds: true } },
      },
    });
    if (!c || c.gameType !== GameType.CRASH) {
      throw new NotFoundException('Crash chain not found');
    }
    const row = this.toListRow(c);
    return { ...row, serverSeed: c.serverSeed };
  }

  /**
   * Same as script menu 1 / 2 / custom length: new row is **inactive** until client seed is set (menu 3).
   */
  async createCrashChain(body: {
    preset?: CrashChainLengthPreset;
    totalRounds?: number;
  }): Promise<{
    chain: CrashChainDetail;
    notice: string;
  }> {
    let rounds: number;
    if (body.preset === CrashChainLengthPreset.production) {
      rounds = CRASH_SETUP_PROD_CHAIN_LENGTH;
    } else if (body.preset === CrashChainLengthPreset.test) {
      rounds = CRASH_SETUP_TEST_CHAIN_LENGTH;
    } else if (body.totalRounds != null && !Number.isNaN(Number(body.totalRounds))) {
      rounds = Math.floor(Number(body.totalRounds));
      if (rounds < 1 || rounds > CRASH_SETUP_PROD_CHAIN_LENGTH) {
        throw new BadRequestException(
          `totalRounds must be between 1 and ${CRASH_SETUP_PROD_CHAIN_LENGTH}`,
        );
      }
    } else {
      rounds = CRASH_SETUP_TEST_CHAIN_LENGTH;
    }

    const serverSeed = randomBytes(32).toString('hex');
    const finalHash = await calculateCrashFinalHash(serverSeed, rounds);
    const chainId = randomBytes(16).toString('hex');

    const chain = await this.prisma.hashChain.create({
      data: {
        chainId,
        gameType: GameType.CRASH,
        serverSeed,
        finalHash,
        totalRounds: rounds,
        currentRound: 0,
        isActive: false,
        isComplete: false,
      },
      select: {
        id: true,
        chainId: true,
        gameType: true,
        finalHash: true,
        totalRounds: true,
        currentRound: true,
        isActive: true,
        isComplete: true,
        clientSeed: true,
        clientSeedSetAt: true,
        createdAt: true,
        completedAt: true,
        serverSeed: true,
        _count: { select: { crashRounds: true } },
      },
    });

    const row = this.toListRow(chain);
    return {
      chain: { ...row, serverSeed: chain.serverSeed },
      notice:
        'Chain row created with isActive=false (matches setup-crash-chain.ts). Set a 64-char hex Bitcoin block hash on this chain to deactivate other chains, activate this one, and set clientSeed — then restart the Crash WS service. Large production runs (10M) may take several minutes to hash.',
    };
  }

  /**
   * Same as script `setClientSeed`: 64 hex, only chains that still have clientSeed=null,
   * deactivates all CRASH chains then activates the selected row.
   */
  async setClientSeedAndActivate(
    chainId: string,
    clientSeedRaw: string,
  ): Promise<CrashChainDetail> {
    const clientSeed = clientSeedRaw.trim();

    const existing = await this.prisma.hashChain.findFirst({
      where: { chainId, gameType: GameType.CRASH },
    });
    if (!existing) {
      throw new NotFoundException('Crash chain not found');
    }
    if (existing.clientSeed !== null) {
      throw new BadRequestException(
        'This chain already has a client seed. The setup script only allows setting it when clientSeed is null.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.hashChain.updateMany({
        where: { gameType: GameType.CRASH, isActive: true },
        data: { isActive: false },
      });
      await tx.hashChain.update({
        where: { id: existing.id },
        data: {
          clientSeed,
          clientSeedSetAt: new Date(),
          isActive: true,
        },
      });
    });

    return this.getChainById(chainId);
  }

  /**
   * Same as script `precalculateCrashPoints` / `precalculateRounds` for the active chain.
   */
  async precalculateActiveChain(count: number): Promise<{
    startRound: number;
    endRound: number;
    inserted: number;
  }> {
    const activeChain = await this.prisma.hashChain.findFirst({
      where: { gameType: GameType.CRASH, isActive: true },
    });
    if (!activeChain?.clientSeed) {
      throw new BadRequestException(
        'No active chain with client seed (run set client seed first)',
      );
    }

    const clientSeed = activeChain.clientSeed;
    const startRound = activeChain.currentRound + 1;
    const endRound = Math.min(
      startRound + count - 1,
      activeChain.totalRounds,
    );
    if (startRound > endRound) {
      throw new BadRequestException(
        'No rounds left to pre-calculate for this chain (at or past totalRounds)',
      );
    }

    const batchSize = PRECALCULATE_BATCH;
    const totalToCreate = endRound - startRound + 1;
    const batches = Math.ceil(totalToCreate / batchSize);
    let inserted = 0;

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchStart = startRound + batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize - 1, endRound);
      const roundsToCreate: Prisma.CrashRoundCreateManyInput[] = [];

      for (let roundNum = batchStart; roundNum <= batchEnd; roundNum++) {
        const hashCount = activeChain.totalRounds - roundNum;
        let gameHash = activeChain.serverSeed;
        for (let i = 0; i < hashCount; i++) {
          gameHash = sha256Hex(gameHash);
        }

        const hmac = createHmac('sha256', gameHash);
        hmac.update(clientSeed);
        const hex = hmac.digest('hex').substring(0, 8);
        const int = parseInt(hex, 16);

        const rawCrashPoint = (Math.pow(2, 32) / (int + 1)) * (1 - HOUSE_EDGE);
        const rounded = Math.floor(rawCrashPoint * 100) / 100;
        const crashPoint = Math.min(1000, Math.max(1.0, rounded));

        roundsToCreate.push({
          chainId: activeChain.chainId,
          roundNumber: roundNum,
          gameHash,
          crashPoint: new Prisma.Decimal(String(crashPoint)),
          clientSeed,
        });
      }

      const res = await this.prisma.crashRound.createMany({
        data: roundsToCreate,
        skipDuplicates: true,
      });
      inserted += res.count;
      if (batchIndex % 5 === 4) {
        await new Promise<void>((r) => setImmediate(r));
      }
    }

    return { startRound, endRound, inserted };
  }

  /** Same idea as script `showChainStatistics` — only `finished` rounds with real crash points. */
  async getActiveChainStatistics(): Promise<CrashChainStatistics> {
    const activeChain = await this.prisma.hashChain.findFirst({
      where: { gameType: GameType.CRASH, isActive: true },
    });
    if (!activeChain) {
      throw new BadRequestException('No active chain found');
    }

    const rounds = await this.prisma.crashRound.findMany({
      where: {
        chainId: activeChain.chainId,
        crashPoint: { not: new Prisma.Decimal(0) },
      },
      select: { crashPoint: true },
    });

    if (rounds.length === 0) {
      throw new BadRequestException('No rounds found for statistics');
    }

    const crashPoints = rounds.map((r) => Number(r.crashPoint));
    return calculateStatistics(crashPoints);
  }

  private toListRow(c: {
    id: string;
    chainId: string;
    gameType: GameType;
    finalHash: string;
    totalRounds: number;
    currentRound: number;
    isActive: boolean;
    isComplete: boolean;
    clientSeed: string | null;
    clientSeedSetAt: Date | null;
    createdAt: Date;
    completedAt: Date | null;
    serverSeed: string;
    _count: { crashRounds: number };
  }): CrashChainListRow {
    return {
      id: c.id,
      chainId: c.chainId,
      gameType: c.gameType,
      finalHash: c.finalHash,
      totalRounds: c.totalRounds,
      currentRound: c.currentRound,
      isActive: c.isActive,
      isComplete: c.isComplete,
      clientSeed: c.clientSeed,
      clientSeedSetAt: c.clientSeedSetAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      completedAt: c.completedAt?.toISOString() ?? null,
      serverSeedPreview: `${c.serverSeed.slice(0, 12)}…`,
      precalculatedRounds: c._count.crashRounds,
      needsClientSeed: c.clientSeed === null,
    };
  }
}
