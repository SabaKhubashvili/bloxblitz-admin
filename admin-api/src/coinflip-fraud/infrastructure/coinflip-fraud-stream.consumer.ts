import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { RedisService } from '../../redis/redis.service';
import { CoinflipFraudRedisKeys } from './coinflip-fraud.redis-keys';
import { CoinflipFraudRedisRepository } from './coinflip-fraud.redis-repository';
import { ProcessCoinflipFraudEventUseCase } from '../application/process-coinflip-fraud-event.use-case';
import type { CoinflipFraudStreamPayload } from '../domain/coinflip-fraud.events';

/**
 * Consumer name is stored in Redis pending entries. A new PID on each restart
 * orphaned messages for old consumer names, so `XREADGROUP ... >` never
 * redelivered them. Prefer HOSTNAME / COINFLIP_FRAUD_STREAM_CONSUMER in prod.
 */
@Injectable()
export class CoinflipFraudStreamConsumer implements OnModuleInit {
  private readonly log = new Logger(CoinflipFraudStreamConsumer.name);
  private readonly consumerName =
    process.env.COINFLIP_FRAUD_STREAM_CONSUMER?.trim() ||
    process.env.HOSTNAME?.trim() ||
    'admin-api-coinflip-fraud';

  private autoclaimWarned = false;

  constructor(
    private readonly redisManager: RedisService,
    private readonly processEvent: ProcessCoinflipFraudEventUseCase,
    private readonly fraudRepo: CoinflipFraudRedisRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.fraudRepo.ensureStreamAndGroup();
  }

  @Interval(1500)
  async drainStream(): Promise<void> {
    const client: Redis | null = this.redisManager.getClient();
    if (!client) return;

    const stream = CoinflipFraudRedisKeys.stream();
    const group = CoinflipFraudRedisKeys.streamGroup();

    await this.reclaimStalePending(client, stream, group);

    let batch: [string, [string, string[]][]][] | null;
    try {
      batch = (await client.xreadgroup(
        'GROUP',
        group,
        this.consumerName,
        'COUNT',
        '64',
        'BLOCK',
        '800',
        'STREAMS',
        stream,
        '>',
      )) as [string, [string, string[]][]][] | null;
    } catch (e) {
      this.log.warn(
        `coinflip fraud xreadgroup: ${e instanceof Error ? e.message : e}`,
      );
      return;
    }

    if (!batch?.length || !batch[0]?.[1]?.length) {
      return;
    }

    for (const [id, rawFields] of batch[0]![1]!) {
      await this.processOneEntry(client, stream, group, id, rawFields);
    }
  }

  /**
   * Pending entries (delivered to some consumer but not ACKed) are invisible
   * to `>`. Reclaim idle messages so restarts and failures do not strand data.
   */
  private async reclaimStalePending(
    client: Redis,
    stream: string,
    group: string,
  ): Promise<void> {
    const minIdle = Number(process.env.COINFLIP_FRAUD_XAUTOCLAIM_MIN_IDLE_MS);
    const idleMs =
      Number.isFinite(minIdle) && minIdle >= 0 ? minIdle : 15_000;

    for (let round = 0; round < 6; round++) {
      let claimed: unknown;
      try {
        claimed = await client.xautoclaim(
          stream,
          group,
          this.consumerName,
          idleMs,
          '0-0',
          'COUNT',
          64,
        );
      } catch (e) {
        if (!this.autoclaimWarned) {
          this.autoclaimWarned = true;
          this.log.warn(
            `coinflip fraud XAUTOCLAIM unsupported or failed (Redis 6.2+ required): ${e instanceof Error ? e.message : e}`,
          );
        }
        return;
      }

      const messages = this.parseXautoclaimMessages(claimed);
      if (!messages.length) {
        return;
      }

      for (const { id, fields } of messages) {
        await this.processOneEntry(client, stream, group, id, fields);
      }
    }
  }

  private parseXautoclaimMessages(raw: unknown): { id: string; fields: string[] }[] {
    if (!Array.isArray(raw) || raw.length < 2) {
      return [];
    }
    const msgs = raw[1];
    if (!Array.isArray(msgs)) {
      return [];
    }
    const out: { id: string; fields: string[] }[] = [];
    for (const m of msgs) {
      if (!Array.isArray(m) || m.length < 2) {
        continue;
      }
      const id = String(m[0]);
      const fields = m[1];
      if (!Array.isArray(fields)) {
        continue;
      }
      out.push({ id, fields: fields as string[] });
    }
    return out;
  }

  private async processOneEntry(
    client: Redis,
    stream: string,
    group: string,
    id: string,
    rawFields: string[],
  ): Promise<void> {
    const fields = this.fieldsArrayToObject(rawFields);
    const json = fields.payload ?? fields.data;
    if (!json) {
      await client.xack(stream, group, id);
      return;
    }

    let payload: CoinflipFraudStreamPayload;
    try {
      payload = JSON.parse(json) as CoinflipFraudStreamPayload;
    } catch {
      this.log.warn(`coinflip fraud stream id=${id}: invalid JSON, acking`);
      await client.xack(stream, group, id);
      return;
    }

    try {
      await this.processEvent.execute(payload);
      await client.xack(stream, group, id);
    } catch (e) {
      this.log.error(
        `Fraud stream handle id=${id}: ${e instanceof Error ? e.message : e}`,
      );
      // Do not ACK — leave pending; XAUTOCLAIM will retry after min-idle.
    }
  }

  private fieldsArrayToObject(fields: string[]): Record<string, string> {
    const o: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      o[fields[i]!] = fields[i + 1] ?? '';
    }
    return o;
  }
}
