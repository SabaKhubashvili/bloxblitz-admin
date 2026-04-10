import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BanTowersPlayerBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
