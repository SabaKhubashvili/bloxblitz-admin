import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RouletteRestriction } from '../domain/roulette-restriction.entity';
import type { RestrictionTimeframe } from '../domain/restriction-timeframe';
import {
  ROULETTE_RESTRICTION_CACHE,
  type RouletteRestrictionCachePort,
} from './ports/roulette-restriction.cache.port';
import {
  ROULETTE_RESTRICTION_REPOSITORY,
  type RouletteRestrictionRepositoryPort,
} from './ports/roulette-restriction.repository.port';
import { syncRestrictionCacheAfterUpsert } from './sync-restriction-cache.after-upsert';

export interface SetPlayerRestrictionCommand {
  isBanned: boolean;
  banReason: string | null;
  maxWagerAmount: number | null;
  timeframe: RestrictionTimeframe | null;
}

@Injectable()
export class SetPlayerRestrictionUseCase {
  constructor(
    @Inject(ROULETTE_RESTRICTION_REPOSITORY)
    private readonly repo: RouletteRestrictionRepositoryPort,
    @Inject(ROULETTE_RESTRICTION_CACHE)
    private readonly cache: RouletteRestrictionCachePort,
  ) {}

  async execute(
    username: string,
    command: SetPlayerRestrictionCommand,
  ): Promise<RouletteRestriction> {
    this.validateWagerFields(command.maxWagerAmount, command.timeframe);

    const canonical = await this.repo.resolveUsername(username);
    if (!canonical) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    const saved = await this.repo.upsert({
      username: canonical,
      isBanned: command.isBanned,
      banReason: command.banReason,
      maxWagerAmount: command.maxWagerAmount,
      timeframe: command.timeframe,
    });

    await syncRestrictionCacheAfterUpsert(this.cache, saved);
    return RouletteRestriction.fromSnapshot(saved);
  }

  private validateWagerFields(
    max: number | null,
    tf: RestrictionTimeframe | null,
  ): void {
    const hasMax = max != null && max > 0;
    const hasTf = tf != null;
    if (hasMax !== hasTf) {
      throw new BadRequestException(
        'maxWagerAmount and timeframe must both be set together, or both cleared.',
      );
    }
  }
}
