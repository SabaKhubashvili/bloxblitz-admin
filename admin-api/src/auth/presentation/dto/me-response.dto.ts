/** Current staff profile from a valid JWT (`GET /auth/me`). */
export class MeResponseDto {
  id!: string;
  email!: string;
  role!: string;
}
