import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RouletteRestriction } from '../domain/roulette-restriction.entity';
import {
  ROULETTE_RESTRICTION_REPOSITORY,
  type RouletteRestrictionRepositoryPort,
} from './ports/roulette-restriction.repository.port';

@Injectable()
export class GetPlayerRestrictionUseCase {
  constructor(
    @Inject(ROULETTE_RESTRICTION_REPOSITORY)
    private readonly repo: RouletteRestrictionRepositoryPort,
  ) {}

  async execute(username: string): Promise<RouletteRestriction | null> {
    const canonical = await this.repo.resolveUsername(username);
    if (!canonical) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    const row = await this.repo.findByUsername(canonical);
    if (!row) return null;
    return RouletteRestriction.fromSnapshot(row);
  }
}
