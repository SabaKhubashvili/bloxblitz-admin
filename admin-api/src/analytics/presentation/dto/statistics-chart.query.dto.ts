import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { WageringTimeRangePreset } from '../../domain/wagering-time-range';

const PRESET_VALUES = Object.values(WageringTimeRangePreset);

export class StatisticsChartQueryDto {
  @IsOptional()
  @IsIn(PRESET_VALUES)
  preset?: WageringTimeRangePreset;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  gameType?: string;

  @IsOptional()
  @IsString()
  diceRollMode?: string;
}
