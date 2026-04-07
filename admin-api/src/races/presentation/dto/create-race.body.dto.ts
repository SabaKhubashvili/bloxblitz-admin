import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RaceRewardTierBodyDto {
  @IsInt()
  @Min(1)
  @Max(10)
  position!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  rewardAmount!: number;
}

export class CreateRaceBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RaceRewardTierBodyDto)
  rewards!: RaceRewardTierBodyDto[];

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;

  @IsOptional()
  @IsIn(['24h', '7d', 'custom'])
  raceWindow?: '24h' | '7d' | 'custom';
}
