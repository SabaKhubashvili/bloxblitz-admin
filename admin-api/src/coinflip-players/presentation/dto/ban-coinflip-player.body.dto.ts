import { IsISO8601, IsString, MaxLength, MinLength } from 'class-validator';

export class BanCoinflipPlayerBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @IsISO8601()
  untilIso!: string;
}
