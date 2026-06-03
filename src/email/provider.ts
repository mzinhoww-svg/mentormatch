/**
 * Email provider abstraction. The foundation ships with non-networked providers
 * (console/noop) plus test doubles; a real transport (SMTP/Resend/SES) plugs in
 * later behind the same interface without touching callers. Selected via
 * EMAIL_PROVIDER (default 'console'). EMAIL_FROM sets the sender.
 */
import { logger } from '../observability/logger.js';

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
  templateKey: string;
  tenantId: string;
  originEvent: string;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(email: OutgoingEmail): Promise<SendResult>;
}

/** Dev/default: logs the email (metadata only — never the body) and succeeds. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  async send(email: OutgoingEmail): Promise<SendResult> {
    logger.info('email.send', {
      provider: this.name,
      to: email.to,
      templateKey: email.templateKey,
      originEvent: email.originEvent,
      tenantId: email.tenantId,
    });
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  }
}

/** Sends nothing, reports success — for environments with email disabled. */
export class NoopEmailProvider implements EmailProvider {
  readonly name = 'noop';
  async send(): Promise<SendResult> {
    return { ok: true, providerMessageId: 'noop' };
  }
}

let cached: EmailProvider | null = null;

/** Returns the configured provider (cached). */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const name = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  cached = name === 'noop' ? new NoopEmailProvider() : new ConsoleEmailProvider();
  return cached;
}

/** Test seam: override the cached provider. */
export function __setEmailProvider(p: EmailProvider | null): void {
  cached = p;
}
