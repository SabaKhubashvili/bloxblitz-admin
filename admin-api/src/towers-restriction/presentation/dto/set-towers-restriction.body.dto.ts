import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class SetTowersRestrictionBodyDto {
  @IsBoolean()
  isBanned!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  banReason?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  dailyWagerLimit?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  weeklyWagerLimit?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monthlyWagerLimit?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  limitReason?: string | null;
}
