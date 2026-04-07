export type ResetActiveMinesGameResultDto = {
  gameId: string;
  username: string;
  grossCredit: number;
  credited: boolean;
  redisCleaned: boolean;
  dbUpdated: boolean;
  skippedReason?: string;
};

export type ResetActiveMinesSummaryDto = {
  modeAfter: string;
  gamesProcessed: number;
  gamesCredited: number;
  games: ResetActiveMinesGameResultDto[];
};
