import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { ITwoFactorMailer } from '../domain/two-factor-mailer';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTwoFactorEmailHtml(
  code: string,
  brandName: string,
  minutesValid: number,
): string {
  const safeCode = escapeHtml(code);
  const safeBrand = escapeHtml(brandName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Sign-in verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:#94a3b8;text-transform:uppercase;">${safeBrand}</p>
              <h1 style="margin:12px 0 0;font-size:22px;font-weight:600;color:#f8fafc;line-height:1.3;">Verify your sign-in</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 32px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155;">
                Use this code to finish signing in to the admin console. For your security, do not share it with anyone.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding:24px 16px;background-color:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:#64748b;text-transform:uppercase;">Your verification code</p>
                    <p style="margin:0;font-family:'SF Mono',Consolas,'Liberation Mono',Menlo,monospace;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#0f172a;line-height:1.2;">${safeCode}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
                This code expires in <strong style="color:#334155;">${minutesValid} minutes</strong>. If you did not request this email, you can safely ignore it—your account remains protected.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                This is an automated security message. Replies to this email are not monitored.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

@Injectable()
export class NodemailerTwoFactorMailer implements ITwoFactorMailer {
  private readonly logger = new Logger(NodemailerTwoFactorMailer.name);

  constructor(private readonly config: ConfigService) {}

  async sendLoginCode(toEmail: string, code: string): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ??
      this.config.get<string>('MAIL_FROM')?.trim() ??
      'noreply@localhost';

    const subject =
      this.config.get<string>('TWO_FACTOR_EMAIL_SUBJECT')?.trim() ??
      'Your admin sign-in code';

    const brandName =
      this.config.get<string>('TWO_FACTOR_EMAIL_BRAND')?.trim() ??
      this.config.get<string>('MAIL_BRAND_NAME')?.trim() ??
      'BloxBlitz Admin';

    const ttlMs = Number(this.config.get('TWO_FACTOR_CODE_TTL_MS')) || 300_000;
    const minutesValid = Math.max(1, Math.round(ttlMs / 60_000));

    const text = `Verify your sign-in — ${brandName}\n\nYour verification code: ${code}\n\nThis code expires in ${minutesValid} minutes. If you did not try to sign in, you can ignore this email.\n`;

    const html = buildTwoFactorEmailHtml(code, brandName, minutesValid);

    if (!host) {
      this.logger.warn(
        `SMTP_HOST is not set; 2FA code for ${toEmail} would be: ${code}`,
      );
      return;
    }
    this.logger.log(`Sending login code to email: ${toEmail}`);

    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Brand name: ${brandName}`);
    this.logger.log(`TTL: ${ttlMs}ms`);
    this.logger.log(`Minutes valid: ${minutesValid}`);
    this.logger.log(`Text: ${text}`);
    this.logger.log(`HTML: ${html}`);

    const port = Number(this.config.get('SMTP_PORT')) || 587;
    const secure =
      this.config.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const user = this.config.get<string>('SMTP_USER') ?? '';
    const pass = this.config.get<string>('SMTP_PASS') ?? '';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });

    this.logger.log(`Transporter created`);

    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });

    this.logger.log(`Email sent`);
    this.logger.log(`From: ${from}`);
    this.logger.log(`To: ${toEmail}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Text: ${text}`);
    this.logger.log(`HTML: ${html}`);
  }
}
