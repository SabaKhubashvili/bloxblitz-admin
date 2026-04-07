import { Injectable } from '@nestjs/common';
import { DiceBettingControlRedisService } from '../infrastructure/dice-betting-control.redis.service';

export type DiceBettingStatusDto = { bettingDisabled: boolean };

@Injectable()
export class GetDiceBettingStatusUseCase {
  constructor(
    private readonly bettingRedis: DiceBettingControlRedisService,
  ) {}

  async execute(): Promise<DiceBettingStatusDto> {
    const bettingDisabled = await this.bettingRedis.getBettingDisabled();
    return { bettingDisabled };
  }
}
