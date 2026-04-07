export const COINFLIP_USER_MODERATION_PREFIX = ["coinflip", "user-moderation"] as const;

export function coinflipUserModerationQueryKey(username: string) {
  return [...COINFLIP_USER_MODERATION_PREFIX, username] as const;
}
