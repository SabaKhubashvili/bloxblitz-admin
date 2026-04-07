import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class RewardActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsUUID('4')
  rewardCaseId?: string;

  @IsOptional()
  @IsIn(['all', 'KEY_GRANT', 'CASE_OPEN'])
  eventType: 'all' | 'KEY_GRANT' | 'CASE_OPEN' = 'all';

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['createdAt', 'userUsername', 'eventType'])
  sort: 'createdAt' | 'userUsername' | 'eventType' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
