import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import type { IOtpHasher } from '../domain/otp-hasher';

const OTP_SALT_ROUNDS = 10;

@Injectable()
export class BcryptOtpHasher implements IOtpHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, OTP_SALT_ROUNDS);
  }

  verify(plain: string, hashInput: string): Promise<boolean> {
    return bcrypt.compare(plain, hashInput);
  }
}
