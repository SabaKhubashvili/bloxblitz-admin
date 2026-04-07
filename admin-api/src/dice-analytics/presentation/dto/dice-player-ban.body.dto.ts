import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BanDicePlayerBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
