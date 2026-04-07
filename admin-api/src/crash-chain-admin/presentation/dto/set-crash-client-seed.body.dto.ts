import { IsString, Matches } from 'class-validator';

/** Same validation as `setup-crash-chain.ts` setClientSeed (64 hex block hash). */
export class SetCrashClientSeedBodyDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'clientSeed must be a 64-character hexadecimal string (Bitcoin block hash)',
  })
  clientSeed!: string;
}
