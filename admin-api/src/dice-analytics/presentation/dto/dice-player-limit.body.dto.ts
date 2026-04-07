import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class LimitDicePlayerBodyDto {
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  maxBet!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
