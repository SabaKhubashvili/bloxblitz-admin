import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { CrashPlayersModerationFilter } from '../../domain/crash-player-public-status';
import type { CrashPlayersTimePreset } from '../../domain/crash-player-list.criteria';
import type { CrashPlayersSortField } from '../../domain/crash-player-list.criteria';

export class CrashPlayersListQueryDto {
  @IsOptional()
  @IsIn(['24h', '7d', '30d', 'custom'])
  range?: CrashPlayersTimePreset;

  @ValidateIf((o: CrashPlayersListQueryDto) => o.range === 'custom')
  @IsDateString()
  from?: string;

  @ValidateIf((o: CrashPlayersListQueryDto) => o.range === 'custom')
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  @IsOptional()
  @IsIn(['active', 'limited', 'banned'])
  status?: CrashPlayersModerationFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(['username', 'totalWagered', 'profitLoss', 'totalBets'])
  sort?: CrashPlayersSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
