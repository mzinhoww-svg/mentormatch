/**
 * Tenant member invitation (admin action). Creates an ACTIVE account with a
 * discardable bootstrap password (never revealed) and emails a one-time
 * set-password link (7 days) — mirroring the admin-onboarding flow. Reuses
 * signup() so consent + RLS are handled; a duplicate email throws email_taken.
 */
import { randomBytes } from 'node:crypto';
import { signup } from '../auth/authService.js';
import { createResetToken } from '../auth/session.js';
import { sendSetPasswordEmail } from '../email/transactional.js';
import { getEmailProvider, type EmailProvider } from '../email/provider.js';
import { logger } from '../observability/logger.js';

const ALLOWED_ROLES = new Set(['member', 'program_manager', 'admin']);
const SET_PASSWORD_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface InviteMemberInput {
  host: string | null | undefined;
  tenantName: string;
  email: string;
  displayName?: string;
  role?: string;
}
export interface InviteMemberResult {
  userId: string;
  email: string;
  role: string;
  setPasswordUrl: string;
  emailSent: boolean;
}

export async function inviteMember(
  input: InviteMemberInput,
  provider: EmailProvider = getEmailProvider(),
): Promise<InviteMemberResult> {
  const role = input.role && ALLOWED_ROLES.has(input.role) ? input.role : 'member';
  const created = await signup({
    host: input.host,
    email: input.email,
    password: randomBytes(24).toString('base64url'),
    displayName: input.displayName,
    role,
    consent: true,
  });
  const token = createResetToken({
    sub: created.id,
    tenantId: created.tenantId,
    ttlSeconds: SET_PASSWORD_TTL_SECONDS,
  });
  const cleanHost = (input.host ?? '').split(':')[0];
  const setPasswordUrl = `https://${cleanHost}/set-password?token=${encodeURIComponent(token)}`;
  const send = await sendSetPasswordEmail(
    {
      to: input.email,
      recipientName: input.displayName ?? null,
      tenantName: input.tenantName,
      setPasswordUrl,
      validDays: 7,
    },
    created.tenantId,
    provider,
  );
  logger.info('member.invited', { tenantId: created.tenantId, role, emailSent: send.ok });
  return { userId: created.id, email: input.email, role: created.role, setPasswordUrl, emailSent: send.ok };
}
