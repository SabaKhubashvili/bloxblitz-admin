export interface IPasswordVerifier {
  verify(plainPassword: string, passwordHash: string): Promise<boolean>;
}
