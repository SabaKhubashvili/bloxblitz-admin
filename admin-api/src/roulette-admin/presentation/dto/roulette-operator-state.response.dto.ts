export type RouletteOperatorStateResponseDto = {
  /** True when Redis returned a JSON payload for `roulette:state`. */
  available: boolean;
  /** Raw snapshot from the game server (shape defined by WS). */
  state: unknown | null;
  /** ISO time when this snapshot was read. */
  fetchedAt: string;
};
