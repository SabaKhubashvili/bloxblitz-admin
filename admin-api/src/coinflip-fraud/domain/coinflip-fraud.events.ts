export type CoinflipFraudStreamEventType =
  | 'game_created'
  | 'player_joined'
  | 'match_ready'
  | 'result_committed'
  | 'payout_completed';

export type CoinflipFraudGameCreatedPayload = {
  type: 'game_created';
  gameId: string;
  creatorUsername: string;
  creatorUserId?: string;
  betAmount: string;
  createdAtMs: number;
  ipHash?: string;
  deviceFingerprint?: string;
};

export type CoinflipFraudPlayerJoinedPayload = {
  type: 'player_joined';
  gameId: string;
  joinerUsername: string;
  joinerUserId?: string;
  creatorUsername: string;
  joinedAtMs: number;
  ipHash?: string;
  deviceFingerprint?: string;
  /** True when player2 is a built-in coinflip bot (`cfbot:` id). */
  joinerIsBot: boolean;
};

export type CoinflipFraudMatchReadyPayload = {
  type: 'match_ready';
  gameId: string;
  readyAtMs: number;
  player1Username: string;
  player2Username: string;
  player1IsBot: boolean;
  player2IsBot: boolean;
};

export type CoinflipFraudResultCommittedPayload = {
  type: 'result_committed';
  gameId: string;
  committedAtMs: number;
  winnerUsername: string;
  loserUsername: string;
  randomValue: number;
  player1IsBot: boolean;
  player2IsBot: boolean;
};

export type CoinflipFraudPayoutCompletedPayload = {
  type: 'payout_completed';
  gameId: string;
  payoutAtMs: number;
  player1Username: string;
  player2Username: string;
  player1IsBot: boolean;
  player2IsBot: boolean;
  winnerUsername: string;
  loserUsername: string;
  stakeAmount: string;
  /** Gross pot before house take (2 * stake for equal bets). */
  grossPot: string;
  /** Amount credited to human winner balance (after house edge). */
  payoutToWinner: string;
  /** House edge as decimal 0..1 at time of settlement. */
  houseEdge: number;
  createdAtMs: number;
  joinedAtMs?: number;
  resultCommittedAtMs?: number;
  creatorIpHash?: string;
  joinerIpHash?: string;
  creatorFingerprint?: string;
  joinerFingerprint?: string;
};

export type CoinflipFraudStreamPayload =
  | CoinflipFraudGameCreatedPayload
  | CoinflipFraudPlayerJoinedPayload
  | CoinflipFraudMatchReadyPayload
  | CoinflipFraudResultCommittedPayload
  | CoinflipFraudPayoutCompletedPayload;
