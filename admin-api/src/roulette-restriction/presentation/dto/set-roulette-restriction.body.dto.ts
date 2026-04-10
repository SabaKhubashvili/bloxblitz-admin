import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class SetRouletteRestrictionBodyDto {
  @IsBoolean()
  isBanned!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  banReason?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxWagerAmount?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsIn(['HOURLY', 'DAILY', 'WEEKLY'])
  timeframe?: 'HOURLY' | 'DAILY' | 'WEEKLY' | null;
}
