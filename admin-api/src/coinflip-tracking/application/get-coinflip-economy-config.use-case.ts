import { Injectable } from '@nestjs/common';
import type { CoinflipEconomyConfig } from '../domain/coinflip-economy-config';
import { CoinflipEconomyConfigService } from './coinflip-economy-config.service';

@Injectable()
export class GetCoinflipEconomyConfigUseCase {
  constructor(
    private readonly coinflipEconomyConfig: CoinflipEconomyConfigService,
  ) {}

  execute(): Promise<CoinflipEconomyConfig> {
    return this.coinflipEconomyConfig.getConfig();
  }
}
