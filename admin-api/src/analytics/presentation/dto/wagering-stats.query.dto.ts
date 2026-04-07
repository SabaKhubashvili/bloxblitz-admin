import { DiceRollMode, GameType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { WageringTimeRangePreset } from '../../domain/wagering-time-range';

export class WageringStatsQueryDto {
  /**
   * If set, only this rolling window is returned; otherwise all four (24h, 7d, 30d, 1y).
   */
  @IsOptional()
  @IsEnum(WageringTimeRangePreset)
  range?: WageringTimeRangePreset;

  @IsOptional()
  @IsEnum(GameType)
  gameType?: GameType;

  /**
   * Dice over/under; only applied when `gameType` is DICE (validated in use case).
   */
  @IsOptional()
  @IsEnum(DiceRollMode)
  diceRollMode?: DiceRollMode;
}
