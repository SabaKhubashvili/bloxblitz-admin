import { Injectable } from '@nestjs/common';
import { CoinflipHistoryService } from './coinflip-history.service';
import type { CoinflipHistoryQueryDto } from '../presentation/dto/coinflip-history.query.dto';
import type {
  CoinflipHistoryGameDto,
  CoinflipHistoryResponseDto,
} from '../presentation/dto/coinflip-history.response.dto';

@Injectable()
export class GetCoinflipHistoryUseCase {
  constructor(private readonly historyService: CoinflipHistoryService) {}

  async execute(query: CoinflipHistoryQueryDto): Promise<CoinflipHistoryResponseDto> {
    const searchRaw = query.search?.trim() ?? '';
    const searchNeedle = searchRaw.length > 0 ? searchRaw : null;

    let minPot: number | null = null;
    if (query.minPot != null && String(query.minPot).trim() !== '') {
      const n = Number(query.minPot);
      if (!Number.isFinite(n) || n < 0) {
        return { games: [] };
      }
      minPot = Math.round(n * 100) / 100;
    }

    const rows = await this.historyService.findRecentFiltered({
      searchNeedle,
      minPot,
    });

    const games: CoinflipHistoryGameDto[] = rows.map((r) => {
      const total = Number(r.total_wager ?? 0);
      const totalWager = Number.isFinite(total)
        ? Math.round(total * 100) / 100
        : 0;
      const half =
        totalWager > 0 ? Math.round((totalWager / 2) * 100) / 100 : 0;

      const p1Side = (r.player1_side === 'T' ? 'T' : 'H') as 'H' | 'T';
      const p2Side: 'H' | 'T' = p1Side === 'H' ? 'T' : 'H';
      const wSide = (r.winner_side === 'T' ? 'T' : 'H') as 'H' | 'T';

      const winner =
        wSide === p1Side ? r.player1_username : r.player2_username;

      return {
        id: r.game_id,
        player1: {
          username: r.player1_username,
          side: p1Side,
          wager: half,
        },
        player2: {
          username: r.player2_username,
          side: p2Side,
          wager: half,
        },
        totalWager,
        state: 'finished' as const,
        winner,
        createdAt: new Date(r.created_at).toISOString(),
      };
    });

    return { games };
  }
}
