import type { AdminUserModerationStatus } from './admin-user-moderation-status';
import type { AdminUserStatus } from './admin-user-status';

/** Chat ban snapshot (Redis `chat:bans`, enforced by WS `ChatStaffService`). */
export interface AdminUserChatBanInfo {
  banned: boolean;
  permanent: boolean;
  expires_at: string | null;
  banned_at: string | null;
  banned_by: string | null;
  reason: string | null;
}

export function emptyChatBanInfo(): AdminUserChatBanInfo {
  return {
    banned: false,
    permanent: false,
    expires_at: null,
    banned_at: null,
    banned_by: null,
    reason: null,
  };
}

/** Safe projection for admin UI (no secrets). Game `User` has no email/name columns — those are null. */
export interface AdminUserSummary {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  balance: string;
  total_wagered: string;
  total_xp: number;
  current_level: number;
  role: string;
  /** Login / engagement bucket (derived from `last_login_at`). */
  status: AdminUserStatus;
  /** Cross-game moderation worst-of (ban beats limit). */
  moderation_status: AdminUserModerationStatus;
  created_at: Date;
  last_login: Date | null;

  last_login_ip: string | null;
  last_known_ip: string | null;
  last_user_agent: string | null;
  last_device: string | null;
  geo_country: string | null;
  geo_city: string | null;
  geo_timezone: string | null;
  last_active_at: Date | null;
  login_count: number;
  ip_history: string[];
  device_history: string[];
  device_fingerprint: string | null;
  is_vpn: boolean | null;
  is_proxy: boolean | null;
  chat_ban: AdminUserChatBanInfo;
}
