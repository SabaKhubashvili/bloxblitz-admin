export interface ITwoFactorCodeGenerator {
  /** 6-digit numeric string, e.g. "042891". */
  generateSixDigitCode(): string;
}
