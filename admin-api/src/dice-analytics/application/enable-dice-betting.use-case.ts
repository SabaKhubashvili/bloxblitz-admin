import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DiceBettingControlRedisService } from '../infrastructure/dice-betting-control.redis.service';
import type { DiceBettingStatusDto } from './get-dice-betting-status.use-case';

@Injectable()
export class EnableDiceBettingUseCase {
  constructor(
    private readonly bettingRedis: DiceBettingControlRedisService,
  ) {}

  async execute(): Promise<DiceBettingStatusDto> {
    try {
      await this.bettingRedis.setBettingDisabled(false);
    } catch {
      throw new ServiceUnavailableException(
        'Could not persist betting flag — Redis unavailable',
      );
    }
    return { bettingDisabled: false };
  }
}
