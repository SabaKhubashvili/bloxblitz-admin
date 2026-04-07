import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MinesPlayerControlStatus } from '@prisma/client';

export class MinesModerationListQueryDto {
  @IsOptional()
  @IsEnum(MinesPlayerControlStatus)
  /** Omit to list BANNED and LIMITED only */
  status?: MinesPlayerControlStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}
