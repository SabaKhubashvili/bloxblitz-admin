import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BanCrashPlayerBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
