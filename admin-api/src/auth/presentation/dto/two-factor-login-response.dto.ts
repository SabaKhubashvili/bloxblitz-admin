export class LoginUserDto {
  id!: string;
  email!: string;
  role!: string;
}

/** Returned after POST /auth/2fa/verify (same shape as legacy single-step login). */
export class AuthSessionResponseDto {
  accessToken!: string;
  tokenType!: string;
  expiresIn!: number;
  user!: LoginUserDto;
}

/** Returned after POST /auth/login when password is valid. */
export class TwoFactorRequiredResponseDto {
  requiresTwoFactor!: true;
  challengeId!: string;
  expiresIn!: number;
  emailMasked!: string;
}
