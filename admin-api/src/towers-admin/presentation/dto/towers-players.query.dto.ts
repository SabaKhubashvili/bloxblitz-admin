import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class TowersPlayersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}
