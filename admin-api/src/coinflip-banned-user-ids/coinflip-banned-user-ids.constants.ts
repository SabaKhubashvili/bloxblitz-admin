/**
 * Redis Set of banned **usernames** (`User.username`, unique) for WS `SISMEMBER` checks.
 * Key name kept as `coinflip:banned:users` for compatibility.
 */
export const COINFLIP_BANNED_USERNAMES_REDIS_KEY = 'coinflip:banned:users';
