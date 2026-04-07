/**
 * Stored at Redis key `chat:bans` as a JSON array (shared with BloxBlitz_Amp WS
 * `ChatStaffService`). `expiresAt` null or omitted means permanent.
 */
export interface ChatBanRecord {
  username: string;
  timestamp: string;
  reason: string;
  bannedBy: string;
  expiresAt: string | null;
}
