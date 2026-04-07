import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { CoinflipPlayersSortField } from '../../domain/coinflip-player-list.criteria';
import type { CoinflipPlayerPublicStatus } from '../../domain/coinflip-player-public-status';

const SORT_FIELDS: CoinflipPlayersSortField[] = [
  'totalWagered',
  'profitLoss',
  'winRate',
  'totalGames',
  'username',
];

const STATUS_FILTER: Array<CoinflipPlayerPublicStatus | 'all'> = [
  'all',
  'active',
  'limited',
  'banned',
];

export class CoinflipPlayersListQueryDto {
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
  @IsIn(SORT_FIELDS)
  sort?: CoinflipPlayersSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsUUID('4')
  userId?: string;

  /** Case-insensitive substring match; ignored if `userId` is set. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsIn(STATUS_FILTER)
  status?: CoinflipPlayerPublicStatus | 'all';
}
