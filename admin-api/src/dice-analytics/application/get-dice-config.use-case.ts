import { Inject, Injectable } from '@nestjs/common';
import type { DiceConfig } from '../domain/dice-config.defaults';
import type { IDiceConfigRepository } from '../domain/dice-config.repository.port';
import { DICE_CONFIG_REPOSITORY } from '../infrastructure/dice-config.tokens';

@Injectable()
export class GetDiceConfigUseCase {
  constructor(
    @Inject(DICE_CONFIG_REPOSITORY)
    private readonly repo: IDiceConfigRepository,
  ) {}

  execute(): Promise<DiceConfig> {
    return this.repo.loadResolvedConfig();
  }
}
