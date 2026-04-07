import { Injectable } from '@nestjs/common';
import type { CoinflipPlayerHistoryPage } from '../domain/coinflip-player-history.types';
import { PrismaCoinflipPlayersRepository } from '../infrastructure/prisma-coinflip-players.repository';

@Injectable()
export class GetCoinflipPlayerHistoryUseCase {
  constructor(private readonly repo: PrismaCoinflipPlayersRepository) {}

  execute(
    username: string,
    page: number,
    limit: number,
  ): Promise<CoinflipPlayerHistoryPage> {
    return this.repo.findHistoryPage(username, page, limit);
  }
}
