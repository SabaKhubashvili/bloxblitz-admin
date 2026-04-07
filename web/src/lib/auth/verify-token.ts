import { jwtVerify, type JWTPayload } from "jose";

export type StaffJwtPayload = JWTPayload & {
  sub: string;
  email?: string;
  role?: string;
};

/**
 * Verifies HS256 JWT (must match admin-api signing config).
 * Safe for Edge middleware and Node route handlers.
 */
export async function verifyAuthToken(
  token: string,
  secret: string,
): Promise<StaffJwtPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    algorithms: ["HS256"],
  });
  return payload as StaffJwtPayload;
}
