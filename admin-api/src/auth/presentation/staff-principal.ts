/** Populated on `request.user` by JwtStrategy after a valid Bearer token. */
export interface StaffPrincipal {
  staffId: string;
  email: string;
  role: string;
  username: string;
}
