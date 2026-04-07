import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IPasswordVerifier } from '../domain/password-verifier';

@Injectable()
export class BcryptPasswordVerifier implements IPasswordVerifier {
  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
