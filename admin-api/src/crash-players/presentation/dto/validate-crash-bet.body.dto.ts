import { IsNotEmpty, IsNumberString, IsString, MaxLength } from 'class-validator';

export class ValidateCrashBetBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @IsNumberString()
  @MaxLength(24)
  betAmount: string;
}
