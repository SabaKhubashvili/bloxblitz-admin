import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ITwoFactorCodeGenerator } from '../domain/two-factor-code.generator';

@Injectable()
export class SecureSixDigitCodeGenerator implements ITwoFactorCodeGenerator {
  generateSixDigitCode(): string {
    const n = randomInt(0, 1_000_000);
    return String(n).padStart(6, '0');
  }
}
