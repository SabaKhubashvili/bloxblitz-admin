import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TowersPlayerRestriction } from '../domain/towers-restriction.entity';
import {
  TOWERS_RESTRICTION_CACHE,
  type TowersRestrictionCachePort,
} from './ports/towers-restriction.cache.port';
import {
  TOWERS_RESTRICTION_REPOSITORY,
  type TowersRestrictionRepositoryPort,
} from './ports/towers-restriction.repository.port';
import { syncTowersRestrictionCacheAfterUpsert } from './sync-towers-restriction-cache.after-upsert';

export type SetTowersRestrictionCommand = {
  isBanned: boolean;
  banReason: string | null;
  dailyWagerLimit: number | null;
  weeklyWagerLimit: number | null;
  monthlyWagerLimit: number | null;
  limitReason: string | null;
};

@Injectable()
export class SetTowersRestrictionUseCase {
  constructor(
    @Inject(TOWERS_RESTRICTION_REPOSITORY)
    private readonly repo: TowersRestrictionRepositoryPort,
    @Inject(TOWERS_RESTRICTION_CACHE)
    private readonly cache: TowersRestrictionCachePort,
  ) {}

  async execute(
    username: string,
    command: SetTowersRestrictionCommand,
  ): Promise<TowersPlayerRestriction> {
    this.validateLimitFields(command);

    const canonical = await this.repo.resolveUsername(username);
    if (!canonical) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    const limitNote =
      command.limitReason?.trim().slice(0, 500) || null;
    const banNote = command.banReason?.trim().slice(0, 500) || null;

    const saved = await this.repo.upsert({
      username: canonical,
      isBanned: command.isBanned,
      banReason: banNote,
      dailyWagerLimit: command.dailyWagerLimit,
      weeklyWagerLimit: command.weeklyWagerLimit,
      monthlyWagerLimit: command.monthlyWagerLimit,
      limitReason: limitNote,
    });

    await syncTowersRestrictionCacheAfterUpsert(this.cache, saved);
    return TowersPlayerRestriction.fromSnapshot(saved);
  }

  private validateLimitFields(cmd: SetTowersRestrictionCommand): void {
    const limits = [
      cmd.dailyWagerLimit,
      cmd.weeklyWagerLimit,
      cmd.monthlyWagerLimit,
    ];
    for (const n of limits) {
      if (n != null && (!Number.isFinite(n) || n < 0)) {
        throw new BadRequestException(
          'Wager limits must be non-negative numbers or empty.',
        );
      }
      if (n === 0) {
        throw new BadRequestException(
          'Use empty/zero as "no limit" by omitting the field —0 is not allowed.',
        );
      }
    }
  }
}
