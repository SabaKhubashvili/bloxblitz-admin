import { Injectable, Logger } from '@nestjs/common';
import {
  MinesSystemMode,
  type MinesSystemStatePayload,
} from '../domain/mines-system-state';
import { MinesSystemStateRedisService } from '../infrastructure/mines-system-state.redis.service';

@Injectable()
export class PauseMinesUseCase {
  private readonly log = new Logger(PauseMinesUseCase.name);

  constructor(
    private readonly minesSystemState: MinesSystemStateRedisService,
  ) {}

  async execute(): Promise<MinesSystemStatePayload> {
    const next: MinesSystemStatePayload = { mode: MinesSystemMode.PAUSED };
    const saved = await this.minesSystemState.write(next);
    this.log.log('[AUDIT] mines.system.pause mode=PAUSED');
    return saved;
  }
}
