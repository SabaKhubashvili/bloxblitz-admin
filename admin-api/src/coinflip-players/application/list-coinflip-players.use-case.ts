import { Injectable } from '@nestjs/common';
import type { CoinflipPlayersListCriteria } from '../domain/coinflip-player-list.criteria';
import type { CoinflipPlayersListPage } from '../domain/coinflip-player-list.row';
import { PrismaCoinflipPlayersRepository } from '../infrastructure/prisma-coinflip-players.repository';

@Injectable()
export class ListCoinflipPlayersUseCase {
  constructor(private readonly repo: PrismaCoinflipPlayersRepository) {}

  execute(criteria: CoinflipPlayersListCriteria): Promise<CoinflipPlayersListPage> {
    return this.repo.findPlayersPage(criteria);
  }
}
