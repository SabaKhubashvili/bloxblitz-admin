import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  MinesSystemMode,
  type MinesSystemStatePayload,
} from '../domain/mines-system-state';
import { MinesSystemStateRedisService } from '../infrastructure/mines-system-state.redis.service';

@Injectable()
export class ToggleMinesNewGamesUseCase {
  private readonly log = new Logger(ToggleMinesNewGamesUseCase.name);

  constructor(
    private readonly minesSystemState: MinesSystemStateRedisService,
  ) {}

  async execute(): Promise<MinesSystemStatePayload> {
    const current = await this.minesSystemState.read();

    if (current.mode === MinesSystemMode.PAUSED) {
      throw new BadRequestException(
        'Cannot toggle new games while Mines gameplay is paused. Resume first.',
      );
    }

    if (current.mode === MinesSystemMode.ACTIVE) {
      const saved = await this.minesSystemState.write({
        mode: MinesSystemMode.NEW_GAMES_DISABLED,
      });
      this.log.log('[AUDIT] mines.toggle_new_games → NEW_GAMES_DISABLED');
      return saved;
    }

    const saved = await this.minesSystemState.write({
      mode: MinesSystemMode.ACTIVE,
    });
    this.log.log('[AUDIT] mines.toggle_new_games → ACTIVE');
    return saved;
  }
}
