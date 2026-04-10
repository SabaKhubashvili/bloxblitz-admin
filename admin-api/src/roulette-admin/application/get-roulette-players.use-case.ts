import { Injectable } from '@nestjs/common';
import { PrismaRouletteAnalyticsRepository } from '../infrastructure/prisma-roulette-analytics.repository';
import type { RoulettePlayersQueryDto } from '../presentation/dto/roulette-players.query.dto';
import type { RoulettePlayersResponseDto } from '../presentation/dto/roulette-players.response.dto';

@Injectable()
export class GetRoulettePlayersUseCase {
  constructor(private readonly repo: PrismaRouletteAnalyticsRepository) {}

  async execute(query: RoulettePlayersQueryDto): Promise<RoulettePlayersResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));
    const offset = (page - 1) * limit;
    const sort = query.sort ?? 'wagered';
    const order = query.order ?? 'desc';

    const { rows, total } = await this.repo.listPlayerAggregates({
      limit,
      offset,
      sort,
      order,
      username: query.username,
    });

    return {
      players: rows.map((r) => ({
        username: r.username,
        games: Number(r.games ?? 0),
        wagered: Number(r.wagered ?? 0),
        userProfit: Number(r.user_profit ?? 0),
      })),
      total,
      page,
      limit,
    };
  }
}
