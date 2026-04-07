import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MINES_ADMIN_USERNAME_MAX_LEN } from '../../common/mines-admin-username';

const MINES_PLAYERS_MODERATION = [
  'all',
  'ACTIVE',
  'BANNED',
  'LIMITED',
] as const;

export type MinesPlayersModerationQuery = (typeof MINES_PLAYERS_MODERATION)[number];

export class MinesPlayersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(MINES_ADMIN_USERNAME_MAX_LEN)
  /** Case-insensitive partial match on username */
  search?: string;

  @IsOptional()
  @IsIn(MINES_PLAYERS_MODERATION)
  /** When not `all`, SQL is constrained using Redis-scanned moderation keys. */
  moderationStatus?: MinesPlayersModerationQuery;

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
}
