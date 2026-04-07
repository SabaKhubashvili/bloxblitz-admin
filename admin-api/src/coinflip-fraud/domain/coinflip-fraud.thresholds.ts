/**
 * Central tuning knobs for coinflip fraud detection.
 * Adjust based on traffic volume, stake mix, and tolerance for false positives.
 */

/** Keep last N completed coinflips per user in the rolling ZSET (O(log N) trims). */
export const ROLLING_GAMES_CAP = 100;

/** When staff flags a user, merge that signal into up to this many recent settled games (suspicious-games list). */
export const STAFF_FLAG_GAME_LOOKBACK = 25;

/** Top opponents by encounter frequency; excess trimmed to cap Redis growth. */
export const TOP_OPPONENTS_CAP = 20;

/** Recent latency samples for variance-based bot signals. */
export const TIMING_SAMPLES_CAP = 50;

/** Pair ZSET index: track most active PvP pairs for graph jobs (trimmed). */
export const PAIR_INDEX_MAX = 2000;

/** Minimum completed PvP games before win-rate / EV rules contribute solid weight. */
export const MIN_GAMES_WIN_RATE = 30;

/** Wilson / normal-approx confidence — flag if lower bound of win rate exceeds this (fair coin ~0.5). */
export const WIN_RATE_SUSPICIOUS_LOWER_BOUND = 0.62;

/** Minimum games for EV deviation z-score to apply fully. */
export const MIN_GAMES_EV = 25;

/**
 * Z-score of (actualNet - expectedNet) / sqrt(variance proxy).
 * Variance proxy ~ sum of per-game stake^2 * p*(1-p) style; we use stakes only rough binomial scaling.
 */
export const EV_ZSCORE_FLAG = 2.8;

/** User spec alignment: cumulative expected “win share” = sum(stake * 0.5); compare to cumulative payouts. */
export const EV_WIN_SHARE_RATIO_FLAG = 1.35;

/** Pair played this many times in rolling window contexts → collusion signal. */
export const COLLUSION_REPEAT_PAIR_GAMES = 10;

/** Win share imbalance: one side wins >= this fraction with enough samples. */
export const COLLUSION_WIN_SHARE_IMBALANCE = 0.72;

export const COLLUSION_PAIR_MIN_GAMES = 12;

/** Net flow skew: directed stake transfer imbalance on a pair (as fraction of volume). */
export const MONEY_FLOW_SKEW_RATIO = 0.78;

/** Minimum edge weight (cents) to consider in flow / ring heuristics. */
export const MONEY_FLOW_MIN_CENTS = 500;

/** Coefficient of variation (std/mean) below this on join latency → “too mechanical”. */
export const BOT_JOIN_CV_MAX = 0.08;

/** Mean join latency (ms) below this with enough samples → instant join pattern. */
export const BOT_JOIN_MEAN_MS_MAX = 400;

export const BOT_TIMING_MIN_SAMPLES = 15;

/** Bet exceeds this multiple of user's median rolled stake → spike. */
export const BET_SPIKE_MULTIPLIER = 4.5;

export const BET_SPIKE_MIN_HISTORY = 8;

/** Same hashed IP bucket with at least this many distinct usernames → multi-account hint. */
export const SHARED_IP_USER_THRESHOLD = 3;

/** Shared device fingerprint with >= 2 users. */
export const SHARED_FP_USER_THRESHOLD = 2;

/** Max users tracked per IP / fingerprint set (approximate cap). */
export const IDENTITY_SET_CAP = 48;

/** Graph job: consider pairs with encounter count >= this. */
export const CLUSTER_SEED_MIN_ENCOUNTERS = 6;

/** BFS depth / width limits to stay O(bounded) per tick. */
export const CLUSTER_BFS_MAX_NODES = 80;

/** Risk tiers (composite score 0–100). */
export const TIER_FLAGGED_MIN = 25;
export const TIER_LIMITED_MIN = 50;
export const TIER_CRITICAL_MIN = 75;

/**
 * Soft auto-mitigation (never auto-ban): scale max bet when multiple independent families fire.
 * BPS = basis points of economy maxBet (e.g. 4500 = 45%).
 */
export const AUTO_LIMIT_SCORE_MIN = 55;
export const AUTO_LIMIT_DISTINCT_FAMILIES = 2;
export const AUTO_LIMIT_MAX_BET_SCALE_BPS = 4500;

/** Risk decay per scheduled tick (temporary / persistent components). */
export const DECAY_TEMP_PER_TICK = 1.2;
export const DECAY_PERSISTENT_PER_TICK = 0.35;
export const FRAUD_SCHEDULER_TICK_MS = 120_000;

/** TTL on auxiliary keys (seconds). */
export const SESSION_KEY_TTL_SEC = 86_400;
export const PROCESSED_GAME_TTL_SEC = 172_800;

/** Hash salt env override — must match ws `FRAUD_IDENTITY_HASH_SALT` if validating shared hashing. */
export const FRAUD_HASH_SALT_ENV = 'FRAUD_IDENTITY_HASH_SALT';
