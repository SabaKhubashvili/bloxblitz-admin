import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BanRoulettePlayerBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
