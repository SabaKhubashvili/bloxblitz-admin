import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CoinflipHistoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  /** Parsed as number in use-case; invalid → empty list (not 4xx). */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  minPot?: string;
}
