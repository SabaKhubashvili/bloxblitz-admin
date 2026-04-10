import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import type { RouletteOperatorStateResponseDto } from '../presentation/dto/roulette-operator-state.response.dto';

/** Same key as `ROULETTE_CONFIG.REDIS_STATE_KEY` in the WebSocket game service. */
const ROULETTE_STATE_REDIS_KEY = 'roulette:state';

@Injectable()
export class GetRouletteOperatorStateUseCase {
  private readonly log = new Logger(GetRouletteOperatorStateUseCase.name);

  constructor(private readonly redisManager: RedisService) {}

  async execute(): Promise<RouletteOperatorStateResponseDto> {
    const fetchedAt = new Date().toISOString();
    const client = this.redisManager.getClient();
    if (!client) {
      return { available: false, state: null, fetchedAt };
    }
    try {
      const raw = await client.get(ROULETTE_STATE_REDIS_KEY);
      if (!raw || raw.length === 0) {
        return { available: false, state: null, fetchedAt };
      }
      try {
        const state = JSON.parse(raw) as unknown;
        return { available: true, state, fetchedAt };
      } catch {
        return { available: true, state: raw, fetchedAt };
      }
    } catch (e) {
      this.log.warn(
        `roulette operator state read failed: ${e instanceof Error ? e.message : e}`,
      );
      return { available: false, state: null, fetchedAt };
    }
  }
}
