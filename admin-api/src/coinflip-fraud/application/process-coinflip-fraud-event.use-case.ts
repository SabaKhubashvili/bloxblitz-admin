import { Injectable, Logger } from '@nestjs/common';
import type { CoinflipFraudStreamPayload } from '../domain/coinflip-fraud.events';
import { CoinflipFraudRedisRepository } from '../infrastructure/coinflip-fraud.redis-repository';
import { CoinflipFraudPayoutProcessor } from './coinflip-fraud-payout-processor.service';

@Injectable()
export class ProcessCoinflipFraudEventUseCase {
  private readonly log = new Logger(ProcessCoinflipFraudEventUseCase.name);

  constructor(
    private readonly redis: CoinflipFraudRedisRepository,
    private readonly payoutProcessor: CoinflipFraudPayoutProcessor,
  ) {}

  async execute(payload: CoinflipFraudStreamPayload): Promise<void> {
    try {
      switch (payload.type) {
        case 'game_created':
          await this.redis.mergeGameSession(payload.gameId, {
            creator: payload.creatorUsername,
            bet: payload.betAmount,
            createdAtMs: String(payload.createdAtMs),
            cIp: payload.ipHash ?? '',
            cFp: payload.deviceFingerprint ?? '',
          });
          return;
        case 'player_joined':
          await this.redis.mergeGameSession(payload.gameId, {
            joiner: payload.joinerUsername,
            joinedAtMs: String(payload.joinedAtMs),
            jIp: payload.ipHash ?? '',
            jFp: payload.deviceFingerprint ?? '',
            joinerBot: payload.joinerIsBot ? '1' : '0',
          });
          return;
        case 'match_ready':
          await this.redis.mergeGameSession(payload.gameId, {
            readyAtMs: String(payload.readyAtMs),
          });
          return;
        case 'result_committed':
          await this.redis.mergeGameSession(payload.gameId, {
            resultAtMs: String(payload.committedAtMs),
            winner: payload.winnerUsername,
          });
          return;
        case 'payout_completed':
          await this.payoutProcessor.process(payload);
          return;
        default:
          return;
      }
    } catch (e) {
      this.log.warn(
        `Fraud event ${payload.type} failed: ${e instanceof Error ? e.message : e}`,
      );
      throw e;
    }
  }
}
