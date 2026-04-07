/** JWT claims produced at login and validated by JwtStrategy. */
export interface StaffJwtPayload {
  sub: string;
  email: string;
  role: string;
  username: string;
  iat?: number;
  exp?: number;
}
