import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { decode } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type {
  AccessTokenPayload,
  ITokenIssuer,
  IssuedAccessToken,
} from '../domain/token-issuer';

@Injectable()
export class JwtTokenIssuer implements ITokenIssuer {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issueAccessToken(
    payload: AccessTokenPayload,
  ): Promise<IssuedAccessToken> {
    const expiresIn = this.configService.getOrThrow<string>('JWT_EXPIRES_IN');
    const accessToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        username: payload.username,
      },
      { expiresIn: expiresIn as StringValue },
    );

    const decoded = decode(accessToken) as {
      exp?: number;
      iat?: number;
    } | null;
    const expiresInSeconds =
      decoded?.exp != null && decoded?.iat != null
        ? decoded.exp - decoded.iat
        : 0;

    return { accessToken, expiresInSeconds };
  }
}
