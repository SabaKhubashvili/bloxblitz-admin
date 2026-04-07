export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  username: string;
}

export interface IssuedAccessToken {
  accessToken: string;
  expiresInSeconds: number;
}

export interface ITokenIssuer {
  issueAccessToken(payload: AccessTokenPayload): Promise<IssuedAccessToken>;
}
