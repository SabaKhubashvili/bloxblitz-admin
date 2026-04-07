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
 * TLS for pg when using a custom CA (e.g. DigitalOcean managed Postgres).
 * - Set `DATABASE_SSL_CA_PATH` to a PEM file inside the container, or rely on the
 *   default path below and mount `./certs/db_cert` in Compose (see docker-compose.prod.yml).
 * - If no CA file exists, uses Node default trust store (`rejectUnauthorized: true`) when
 *   the URL implies SSL (`sslmode=require`, etc.) or `DATABASE_SSL=true`.
 * - `DATABASE_SSL=false` disables passing explicit SSL options (non-TLS local DB).
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

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const ssl = pgSslOptions();
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      connectionTimeoutMillis: 5000,
      ...(ssl !== undefined ? { ssl } : {}),
    });

    super({
      adapter,

      log: ['query', 'error', 'warn'],
    });
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
