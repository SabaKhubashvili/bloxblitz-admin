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

export enum AdminUserModerationStatusFilterDto {
  ACTIVE = 'ACTIVE',
  LIMITED = 'LIMITED',
  BANNED = 'BANNED',
}

export enum AdminUserStatusFilterDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  NEVER_LOGGED_IN = 'NEVER_LOGGED_IN',
}

export class AdminUsersFilterQueryDto {
  /**
   * Game users have no email field; this searches `username`, `rblx_id`, and `id` (partial, case-insensitive).
   */
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsEnum(UserRoles)
  role?: UserRoles;

  @IsOptional()
  @IsEnum(AdminUserStatusFilterDto)
  status?: AdminUserStatusFilterDto;

  @IsOptional()
  @IsEnum(AdminUserModerationStatusFilterDto)
  moderationStatus?: AdminUserModerationStatusFilterDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  activeWithinDays?: number;
}
