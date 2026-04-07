import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

const HEADER = 'x-internal-api-key';

@Injectable()
export class InternalServiceKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configured = this.config.get<string>('INTERNAL_CRASH_VALIDATION_KEY');
    if (!configured?.length) {
      throw new ServiceUnavailableException(
        'Crash bet validation is not configured (INTERNAL_CRASH_VALIDATION_KEY).',
      );
    }

    const req = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const headerVal = req.headers[HEADER];
    const provided = Array.isArray(headerVal) ? headerVal[0] : headerVal;
    if (typeof provided !== 'string' || !provided.length) {
      throw new ForbiddenException('Missing internal API key.');
    }

    if (!safeEqualDigest(provided, configured)) {
      throw new ForbiddenException('Invalid internal API key.');
    }

    return true;
  }
}

function safeEqualDigest(a: string, b: string): boolean {
  const da = createHash('sha256').update(a, 'utf8').digest();
  const db = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(da, db);
}
