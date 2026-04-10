import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class TowersHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsIn(['all', 'won', 'lost', 'cashed_out'])
  outcome?: 'all' | 'won' | 'lost' | 'cashed_out';

  /** ISO date string (inclusive lower bound). */
  @IsOptional()
  @IsString()
  from?: string;

  /** ISO date string (inclusive upper bound). */
  @IsOptional()
  @IsString()
  to?: string;
}
