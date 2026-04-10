export type RoulettePlayerRowDto = {
  username: string;
  games: number;
  wagered: number;
  userProfit: number;
};

export type RoulettePlayersResponseDto = {
  players: RoulettePlayerRowDto[];
  total: number;
  page: number;
  limit: number;
};
