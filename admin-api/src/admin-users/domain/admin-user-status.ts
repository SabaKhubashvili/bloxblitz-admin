/** Derived from `User.last_login_at` for admin lists (no DB column). */
export type AdminUserStatus = 'ACTIVE' | 'INACTIVE' | 'NEVER_LOGGED_IN';
