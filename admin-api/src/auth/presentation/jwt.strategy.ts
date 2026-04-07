import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { StaffJwtPayload } from './jwt-payload';
import type { StaffPrincipal } from './staff-principal';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: StaffJwtPayload): StaffPrincipal {
    if (!payload?.sub || typeof payload.email !== 'string') {
      throw new UnauthorizedException('Invalid token subject');
    }
    return {
      staffId: payload.sub,
      email: payload.email,
      role: payload.role ?? 'SUPPORT',
      username: payload.username,
    };
  }
}
