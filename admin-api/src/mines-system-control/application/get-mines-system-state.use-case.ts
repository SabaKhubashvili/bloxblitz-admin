import { Injectable } from '@nestjs/common';
import type { MinesSystemStatePayload } from '../domain/mines-system-state';
import { MinesSystemStateRedisService } from '../infrastructure/mines-system-state.redis.service';

@Injectable()
export class GetMinesSystemStateUseCase {
  constructor(
    private readonly minesSystemState: MinesSystemStateRedisService,
  ) {}

  execute(): Promise<MinesSystemStatePayload> {
    return this.minesSystemState.read();
  }
}
