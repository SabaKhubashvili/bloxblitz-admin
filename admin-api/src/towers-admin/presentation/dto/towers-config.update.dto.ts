import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

/** Partial update: bet limits only; difficulties/levels stay as stored in Redis. */
export class TowersConfigUpdateDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  minBet!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  maxBet!: number;
}
