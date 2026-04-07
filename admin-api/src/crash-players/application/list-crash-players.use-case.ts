import { Injectable } from '@nestjs/common';
import type { CrashPlayersListCriteria } from '../domain/crash-player-list.criteria';
import type { CrashPlayerListPage } from '../domain/crash-player-list.row';
import { PrismaCrashPlayersListRepository } from '../infrastructure/prisma-crash-players-list.repository';

@Injectable()
export class ListCrashPlayersUseCase {
  constructor(
    private readonly crashPlayersList: PrismaCrashPlayersListRepository,
  ) {}

  execute(criteria: CrashPlayersListCriteria): Promise<CrashPlayerListPage> {
    return this.crashPlayersList.findPage(criteria);
  }
}
