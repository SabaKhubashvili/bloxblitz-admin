import type { DiceConfig } from './dice-config.defaults';

export interface IDiceConfigRepository {
  /**
   * Read hash, merge with defaults for missing fields, validate; if invalid or empty, rewrite defaults to Redis.
   * Single round-trip read; optional write when seeding defaults.
   */
  loadResolvedConfig(): Promise<DiceConfig>;

  /** Persist full config to the Redis hash (one HMSET/HSET). */
  saveFull(config: DiceConfig): Promise<void>;
}
