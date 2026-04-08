import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { ITwoFactorMailer } from '../domain/two-factor-mailer';

/** Brevo (Sendinblue) relay — use SMTP key from https://app.brevo.com/settings/keys/smtp */
const BREVO_DEFAULT_HOST = 'smtp-relay.brevo.com';

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

/**
 * Build Nodemailer options for Brevo SMTP (TLS).
 * - Port 587: STARTTLS (secure: false, requireTLS: true)
 * - Port 465: implicit TLS (secure: true)
 * Prefers BREVO_SMTP_*; falls back to legacy SMTP_* for local/dev.
 */
function brevoSmtpTransportOptions(config: ConfigService): SMTPTransport.Options {
  const host =
    config.get<string>('BREVO_SMTP_HOST')?.trim() ||
    config.get<string>('SMTP_HOST')?.trim() ||
    BREVO_DEFAULT_HOST;

  const portRaw =
    config.get<string>('BREVO_SMTP_PORT')?.trim() ||
    config.get<string>('SMTP_PORT')?.trim();
  const port = portRaw ? Number(portRaw) : 587;

  const user =
    config.get<string>('BREVO_SMTP_USER')?.trim() ||
    config.get<string>('SMTP_USER')?.trim() ||
    '';
  const pass =
    config.get<string>('BREVO_SMTP_PASS')?.trim() ||
    config.get<string>('SMTP_PASS')?.trim() ||
    '';

  const secureExplicit = config.get<string>('BREVO_SMTP_SECURE') ?? config.get<string>('SMTP_SECURE');
  const secure =
    secureExplicit === 'true' || (!secureExplicit && port === 465);

  const connectionTimeout =
    Number(config.get('SMTP_CONNECTION_TIMEOUT_MS')) || 15_000;
  const socketTimeout =
    Number(config.get('SMTP_SOCKET_TIMEOUT_MS')) || 30_000;

  return {
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    requireTLS: !secure && port === 587,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout,
    greetingTimeout: connectionTimeout,
    socketTimeout,
  };
}

@Injectable()
export class NodemailerTwoFactorMailer implements ITwoFactorMailer {
  private readonly logger = new Logger(NodemailerTwoFactorMailer.name);

  constructor(private readonly config: ConfigService) {}

  async sendLoginCode(toEmail: string, code: string): Promise<void> {
    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ??
      this.config.get<string>('BREVO_SMTP_FROM')?.trim() ??
      this.config.get<string>('MAIL_FROM')?.trim() ??
      'admin@bloxblitz.com';

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

    const pass =
      this.config.get<string>('BREVO_SMTP_PASS')?.trim() ||
      this.config.get<string>('SMTP_PASS')?.trim() ||
      '';
    const user =
      this.config.get<string>('BREVO_SMTP_USER')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      '';

    if (!pass || !user) {
      this.logger.warn(
        `BREVO_SMTP_USER / BREVO_SMTP_PASS (or SMTP_*) not set; 2FA code for ${toEmail} would be: ${code}`,
      );
      return;
    }

    const transportOpts = brevoSmtpTransportOptions(this.config);
    const { host, port } = transportOpts;

    this.logger.log(`Sending 2FA email via Brevo SMTP ${host}:${port} to ${toEmail}`);

    const transporter = nodemailer.createTransport(transportOpts);

    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });

    this.logger.log(`2FA email sent to ${toEmail}`);
  }
}
