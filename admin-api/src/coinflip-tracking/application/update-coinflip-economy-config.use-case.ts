import { Injectable } from '@nestjs/common';
import type { CoinflipEconomyConfig } from '../domain/coinflip-economy-config';
import { CoinflipEconomyConfigService } from './coinflip-economy-config.service';

@Injectable()
export class UpdateCoinflipEconomyConfigUseCase {
  constructor(
    private readonly coinflipEconomyConfig: CoinflipEconomyConfigService,
  ) {}

  async execute(
    patch: Partial<CoinflipEconomyConfig>,
  ): Promise<CoinflipEconomyConfig> {
    if (Object.keys(patch).length === 0) {
      return this.coinflipEconomyConfig.getConfig();
    }
    return this.coinflipEconomyConfig.updatePartial(patch);
  }
}
