import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SetUserKeysBodyDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  rewardCaseId!: string;

  /**
   * Set the balance to an exact non-negative value.
   * Provide either `newBalance` OR `delta`, not both.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  newBalance?: number;

  /**
   * Apply a signed delta (positive = add, negative = deduct).
   * Resulting balance is clamped to 0. Min −100 000, Max 100 000.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-100_000)
  @Max(100_000)
  delta?: number;

  /** Optional staff-facing reason string stored in the audit log. */
  @IsOptional()
  @IsString()
  reason?: string;
}
