import { Injectable, Logger } from '@nestjs/common';
import {
  MinesSystemMode,
  type MinesSystemStatePayload,
} from '../domain/mines-system-state';
import { MinesSystemStateRedisService } from '../infrastructure/mines-system-state.redis.service';

@Injectable()
export class DisableMinesGamesUseCase {
  private readonly log = new Logger(DisableMinesGamesUseCase.name);

  constructor(
    private readonly minesSystemState: MinesSystemStateRedisService,
  ) {}

  async execute(): Promise<MinesSystemStatePayload> {
    const current = await this.minesSystemState.read();
    if (current.mode === MinesSystemMode.PAUSED) {
      this.log.log('[AUDIT] mines.system.disable_new noop — already PAUSED');
      return current;
    }
    const next: MinesSystemStatePayload = {
      mode: MinesSystemMode.NEW_GAMES_DISABLED,
    };
    const saved = await this.minesSystemState.write(next);
    this.log.log('[AUDIT] mines.system.disable_new mode=NEW_GAMES_DISABLED');
    return saved;
  }
}
