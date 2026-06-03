/**
 * Transactional emails sent DIRECTLY via the provider — for messages that are
 * not derived from a domain notification and therefore (by design) bypass the
 * notification-driven outbox in emailService.ts. Used at provisioning time to
 * deliver the admin's first set-password link synchronously, because the Vercel
 * cron that drained the outbox was removed on the Hobby plan.
 *
 * The body builder is pure (unit-testable, no network); the send wrapper never
 * throws — a provider failure is returned as { ok: false } so provisioning can
 * fall back to printing the link for manual delivery.
 */
import { getEmailProvider, type EmailProvider, type SendResult } from './provider.js';

export interface SetPasswordEmailContext {
  /** Admin recipient address. */
  to: string;
  /** Admin display name (for the greeting), or null. */
  recipientName: string | null;
  /** Tenant display name, shown in subject/body/sign-off. */
  tenantName: string;
  /** Absolute URL of the set-password page (carrying the one-time token). */
  setPasswordUrl: string;
  /** How long the link stays valid, in days (for the copy). */
  validDays: number;
}

/** The template key recorded for this transactional email. */
export const SET_PASSWORD_TEMPLATE_KEY = 'admin.set_password';
/** The synthetic origin event for this transactional email. */
export const SET_PASSWORD_ORIGIN_EVENT = 'tenant.provisioned';

/** Pure: renders the set-password email subject + body. No I/O. */
export function buildSetPasswordEmail(ctx: SetPasswordEmailContext): {
  subject: string;
  body: string;
  templateKey: string;
} {
  const hi = ctx.recipientName ? `Olá, ${ctx.recipientName}.` : 'Olá.';
  const subject = `Acesso ao ${ctx.tenantName}: defina sua senha`;
  const body =
    `${hi}\n\n` +
    `Sua conta de administrador no ${ctx.tenantName} foi criada. ` +
    `Defina sua senha de acesso pelo link abaixo (válido por ${ctx.validDays} dias):\n\n` +
    `${ctx.setPasswordUrl}\n\n` +
    `Se você não reconhece este convite, ignore este e-mail.\n\n` +
    `— ${ctx.tenantName} · Passe adiante.`;
  return { subject, body, templateKey: SET_PASSWORD_TEMPLATE_KEY };
}

/**
 * Sends the set-password email via the configured (or injected) provider.
 * Never throws: a thrown/failed provider becomes a { ok: false } result.
 */
export async function sendSetPasswordEmail(
  ctx: SetPasswordEmailContext,
  tenantId: string,
  provider: EmailProvider = getEmailProvider(),
): Promise<SendResult> {
  const { subject, body, templateKey } = buildSetPasswordEmail(ctx);
  try {
    return await provider.send({
      to: ctx.to,
      subject,
      body,
      templateKey,
      tenantId,
      originEvent: SET_PASSWORD_ORIGIN_EVENT,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
