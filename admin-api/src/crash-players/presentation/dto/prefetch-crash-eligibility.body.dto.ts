import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PrefetchCrashEligibilityBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;
}
