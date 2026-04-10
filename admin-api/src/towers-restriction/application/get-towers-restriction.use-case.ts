import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TowersPlayerRestriction } from '../domain/towers-restriction.entity';
import {
  TOWERS_RESTRICTION_REPOSITORY,
  type TowersRestrictionRepositoryPort,
} from './ports/towers-restriction.repository.port';

@Injectable()
export class GetTowersRestrictionUseCase {
  constructor(
    @Inject(TOWERS_RESTRICTION_REPOSITORY)
    private readonly repo: TowersRestrictionRepositoryPort,
  ) {}

  async execute(username: string): Promise<TowersPlayerRestriction | null> {
    const canonical = await this.repo.resolveUsername(username);
    if (!canonical) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    const row = await this.repo.findByUsername(canonical);
    if (!row) return null;
    return TowersPlayerRestriction.fromSnapshot(row);
  }
}
