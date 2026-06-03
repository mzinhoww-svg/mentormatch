/**
 * Email provider abstraction. Ships non-networked providers (console/noop) for
 * dev/tests plus a real Resend transport for production — all behind the same
 * interface, so callers never change. Selected via EMAIL_PROVIDER
 * (console | noop | resend; default 'console'). EMAIL_FROM sets the sender and
 * RESEND_API_KEY authenticates the Resend transport.
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

/**
 * Resend transport (https://resend.com) — the production sender. Reads
 * RESEND_API_KEY + EMAIL_FROM at send time; if either is missing it reports a
 * normal failure (never throws) so callers degrade gracefully. Logs metadata
 * only — never the email body.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  async send(email: OutgoingEmail): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      logger.warn('email.resend_unconfigured', { hasKey: Boolean(apiKey), hasFrom: Boolean(from) });
      return { ok: false, error: 'resend_not_configured' };
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: email.to, subject: email.subject, text: email.body }),
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 200);
        logger.warn('email.send_failed', {
          provider: this.name,
          status: res.status,
          templateKey: email.templateKey,
          tenantId: email.tenantId,
        });
        return { ok: false, error: `resend_http_${res.status}${detail ? `: ${detail}` : ''}` };
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      logger.info('email.send', {
        provider: this.name,
        to: email.to,
        templateKey: email.templateKey,
        originEvent: email.originEvent,
        tenantId: email.tenantId,
      });
      return { ok: true, providerMessageId: data.id ?? 'resend' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

let cached: EmailProvider | null = null;

/** Returns the configured provider (cached). */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const name = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  cached =
    name === 'resend'
      ? new ResendEmailProvider()
      : name === 'noop'
        ? new NoopEmailProvider()
        : new ConsoleEmailProvider();
  return cached;
}

/** Test seam: override the cached provider. */
export function __setEmailProvider(p: EmailProvider | null): void {
  cached = p;
}
