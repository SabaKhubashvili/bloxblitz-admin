import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { PrismaPg } from '@prisma/adapter-pg';
import type { ConnectionOptions } from 'tls';
import * as fs from 'fs';
import { makeRetryExtension } from './extensions/retryPrisma.extension';

/**
 * TLS for pg (e.g. DigitalOcean managed Postgres uses a CA not in Node's default store).
 * - Mount your provider's CA PEM at `DATABASE_SSL_CA_PATH` (default `/app/certs/db_cert/db_cert.crt`).
 * - If you see "self-signed certificate in certificate chain", you need that CA file, or set
 *   `DATABASE_SSL_REJECT_UNAUTHORIZED=false` (weaker; dev/staging only).
 * - `DATABASE_SSL=false` or `sslmode=disable` disables explicit SSL options (local DB).
 */
function pgSslOptions(): ConnectionOptions | undefined {
  const url = process.env.DATABASE_URL ?? '';
  if (
    process.env.DATABASE_SSL === 'false' ||
    url.includes('sslmode=disable')
  ) {
    return undefined;
  }

  const caPath =
    process.env.DATABASE_SSL_CA_PATH ?? '/app/certs/db_cert/db_cert.crt';
  if (fs.existsSync(caPath)) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(caPath, 'utf8'),
    };
  }

  const needsTlsHint =
    process.env.DATABASE_SSL === 'true' ||
    /\bsslmode=(require|verify-ca|verify-full)\b/.test(url);
  if (!needsTlsHint) {
    return undefined;
  }

  return {
    rejectUnauthorized:
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

/** Avoid pg-connection-string applying its own sslmode/TLS on top of our `ssl` object (conflicts / P1011). */
function stripSslQueryParamsFromDatabaseUrl(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    u.searchParams.delete('sslmode');
    u.searchParams.delete('sslrootcert');
    u.searchParams.delete('sslcert');
    u.searchParams.delete('sslkey');
    return u.toString();
  } catch {
    return connectionString;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const ssl = pgSslOptions();
    let connectionString = process.env.DATABASE_URL!;
    if (ssl !== undefined) {
      connectionString = stripSslQueryParamsFromDatabaseUrl(connectionString);
    }

    const adapter = new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 5000,
      ...(ssl !== undefined ? { ssl } : {}),
    });

    super({
      adapter,

      log: ['query', 'error', 'warn'],
    });

    if (ssl !== undefined && !('ca' in ssl) && ssl.rejectUnauthorized !== false) {
      this.logger.warn(
        'Postgres TLS: no CA file at DATABASE_SSL_CA_PATH — using default trust store. ' +
          'If queries fail with "self-signed certificate in certificate chain", add your provider CA PEM ' +
          '(e.g. DigitalOcean) or set DATABASE_SSL_REJECT_UNAUTHORIZED=false (not recommended for production).',
      );
    }
  }

  async onModuleInit() {
    // Apply retry extension first
    Object.assign(this, this.$extends(makeRetryExtension(this)));
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async connectWithRetry(maxRetries = 5): Promise<void> {
    let attempt = 0;
    const baseDelay = 2000;

    while (attempt < maxRetries) {
      attempt++;
      try {
        await this.$connect();
        this.logger.log('✅ Connected to database via Prisma adapter');
        return;
      } catch (err: any) {
        this.logger.error(
          `❌ DB connection failed (attempt ${attempt}/${maxRetries}): ${err.message}`,
        );
        if (attempt >= maxRetries) throw err;
        const delay = baseDelay * attempt;
        this.logger.warn(`⏳ Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  // Optional helper for safe queries
  async safeQuery<T>(callback: () => Promise<T>): Promise<T> {
    let attempt = 0;
    const maxRetries = 3;
    while (true) {
      try {
        return await callback();
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) throw err;
        this.logger.warn(`Retrying failed query (${attempt}/${maxRetries})...`);
      }
    }
  }
}
