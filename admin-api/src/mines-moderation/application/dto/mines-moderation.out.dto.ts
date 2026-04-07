import type { MinesPlayerControlStatus } from '@prisma/client';

export type MinesModerationRowDto = {
  userUsername: string;
  status: MinesPlayerControlStatus;
  maxBetAmount: number | null;
  maxGamesPerHour: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};
