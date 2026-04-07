export const COINFLIP_FRAUD_USERS_KEY = ["coinflip", "fraud", "suspicious-users"] as const;

export const COINFLIP_FRAUD_GAMES_KEY = ["coinflip", "fraud", "suspicious-games"] as const;

export function coinflipFraudProfileQueryKey(username: string) {
  return ["coinflip", "fraud", "profile", username] as const;
}
