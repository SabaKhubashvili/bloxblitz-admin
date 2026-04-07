import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class MinesConfigUpdateDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBet!: number;

  @Type(() => Number)
  @IsNumber()
  maxBet!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  houseEdge!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rtpTarget!: number;
}
