export interface ITwoFactorMailer {
  sendLoginCode(toEmail: string, code: string): Promise<void>;
}
