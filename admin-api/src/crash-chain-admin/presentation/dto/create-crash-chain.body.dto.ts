import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/** Mirrors `setup-crash-chain.ts` menu options 1 (production) and 2 (test). */
export enum CrashChainLengthPreset {
  production = 'production',
  test = 'test',
}

export class CreateCrashChainBodyDto {
  @IsOptional()
  @IsEnum(CrashChainLengthPreset)
  preset?: CrashChainLengthPreset;

  /** Used when `preset` is omitted (custom length, same bounds as script). */
  @ValidateIf((o: CreateCrashChainBodyDto) => o.preset == null)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  totalRounds?: number;
}
