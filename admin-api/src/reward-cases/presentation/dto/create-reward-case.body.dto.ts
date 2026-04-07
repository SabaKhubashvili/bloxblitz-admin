import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateRewardCaseBodyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase slug format (e.g. reward-gold)',
  })
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  imageUrl!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  position!: number;

  @IsOptional()
  @IsBoolean()
  isRakebackCase = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  milestoneLevel?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive = true;

  @IsOptional()
  @IsBoolean()
  receivesWagerKeys = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  wagerCoinsPerKey = 100;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  wagerKeysMaxPerEvent = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  levelUpKeysOverride?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  xpMilestoneThreshold?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  xpMilestoneMaxKeysPerEvent = 10;

  /** Minimum user level required to unlock this case. 0 = no restriction. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requiredLevel = 0;
}
