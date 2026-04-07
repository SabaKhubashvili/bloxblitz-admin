import { UserRoles } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAdminGameUserBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  /** Set absolute balance (decimal string, e.g. "100.50"). */
  balanceSet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  /** Add to balance (decimal string; may be negative to decrease). */
  balanceDelta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  totalWageredSet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  /** Add to total wagered (decimal string; may be negative to decrease). */
  totalWageredDelta?: string;

  @IsOptional()
  @IsEnum(UserRoles)
  role?: UserRoles;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999_999_999)
  totalXP?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-999_999_999)
  @Max(999_999_999)
  /** Add to total XP (result must stay within 0 … 999_999_999). */
  totalXPDelta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999_999)
  currentLevel?: number;
}
