/** API shape; identical to Redis JSON and GET /admin/mines/config body. */
export type MinesConfigResponseDto = {
  minBet: number;
  maxBet: number;
  houseEdge: number;
  rtpTarget: number;
};
