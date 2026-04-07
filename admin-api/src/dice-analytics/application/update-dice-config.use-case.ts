import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { cloneDiceConfig, type DiceConfig } from '../domain/dice-config.defaults';
import type { IDiceConfigRepository } from '../domain/dice-config.repository.port';
import { validateDiceConfig } from '../domain/dice-config.validation';
import { DICE_CONFIG_REPOSITORY } from '../infrastructure/dice-config.tokens';
import type { DiceConfigUpdateDto } from '../presentation/dto/dice-config.update.dto';

@Injectable()
export class UpdateDiceConfigUseCase {
  private readonly log = new Logger(UpdateDiceConfigUseCase.name);

  constructor(
    @Inject(DICE_CONFIG_REPOSITORY)
    private readonly repo: IDiceConfigRepository,
  ) {}

  async execute(patch: DiceConfigUpdateDto): Promise<DiceConfig> {
    const current = await this.repo.loadResolvedConfig();
    const next = cloneDiceConfig(current);

    if (patch.minBet !== undefined) next.minBet = patch.minBet;
    if (patch.maxBet !== undefined) next.maxBet = patch.maxBet;
    if (patch.houseEdge !== undefined) next.houseEdge = patch.houseEdge;
    if (patch.rtpTarget !== undefined) next.rtpTarget = patch.rtpTarget;
    if (patch.maxPayoutMultiplier !== undefined) {
      next.maxPayoutMultiplier = patch.maxPayoutMultiplier;
    }

    if (!validateDiceConfig(next)) {
      throw new BadRequestException(
        'Invalid dice config: minBet >= 0, maxBet > minBet, houseEdge > 0, rtpTarget in [0, 100], maxPayoutMultiplier > 0',
      );
    }

    await this.repo.saveFull(next);
    this.log.log('Dice admin config persisted to Redis (dice:config)');
    return next;
  }
}
