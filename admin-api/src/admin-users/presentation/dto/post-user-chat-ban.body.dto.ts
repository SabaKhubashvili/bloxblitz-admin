import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class PostUserChatBanBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;

  /** Omit or `null` = permanent ban. */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;
}
