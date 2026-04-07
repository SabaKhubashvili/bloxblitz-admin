export type CoinflipPlayerPublicStatus = 'active' | 'limited' | 'banned';

export type CoinflipPlayersModerationFilter =
  | CoinflipPlayerPublicStatus
  | undefined;
