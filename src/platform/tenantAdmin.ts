/**
 * Platform-side tenant admin management: set/add the admin of an existing tenant
 * and resend a set-password link — without logging in as the tenant. Runs from
 * the platform console (gated by requirePlatformAdmin at the route).
 *
 * Setting an admin either PROMOTES an existing tenant_user to role=admin (and
 * reactivates them) or, for a new email, CREATES the account and emails a
 * one-time set-password link (reusing the member-invite flow). Resend mints a
 * fresh reset token for an existing user and re-emails the link.
 */
import { getTenantById } from '../tenancy/admin.js';
import { getBaseDomain } from '../tenancy/resolveTenant.js';
import { getSettings } from '../settings/settingsService.js';
import { withTenant } from '../tenancy/withTenant.js';
import { createResetToken } from '../auth/session.js';
import { sendSetPasswordEmail } from '../email/transactional.js';
import { getEmailProvider, type EmailProvider } from '../email/provider.js';
import { inviteMember } from '../admin/memberInvite.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { logger } from '../observability/logger.js';

const SET_PASSWORD_TTL_SECONDS = 7 * 24 * 60 * 60;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Resolves an existing tenant to the data the email/link flows need. */
async function tenantContext(tenantId: string): Promise<{ slug: string; host: string; tenantName: string }> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw expectedError(ErrorCode.NOT_FOUND, 'tenant_not_found');
  const host = `${tenant.slug}.${getBaseDomain()}`;
  const tenantName = (await getSettings(tenantId)).branding.displayName ?? tenant.name;
  return { slug: tenant.slug, host, tenantName };
}

function setPasswordUrl(host: string, token: string): string {
  return `https://${host.split(':')[0]}/set-password?token=${encodeURIComponent(token)}`;
}

export interface SetTenantAdminResult {
  userId: string;
  /** true when a new account was created; false when an existing user was promoted. */
  created: boolean;
  emailSent: boolean;
  /** Present only when a new account was created (carries the onboarding token). */
  setPasswordUrl?: string;
}

/**
 * Makes `email` an admin of the tenant. Promotes an existing user (reactivating
 * if needed) or creates+invites a new admin. Returns whether the account is new.
 */
export async function setTenantAdmin(
  input: { tenantId: string; email: string; displayName?: string },
  provider: EmailProvider = getEmailProvider(),
): Promise<SetTenantAdminResult> {
  const email = (input.email || '').trim();
  if (!email) throw expectedError(ErrorCode.VALIDATION, 'email_required');
  const { host, tenantName } = await tenantContext(input.tenantId);

  const existing = await withTenant(input.tenantId, (db) =>
    db.query<{ id: string }>('SELECT id FROM tenant_user WHERE normalized_email = $1', [
      normalize(email),
    ]),
  );

  if (existing.rows[0]) {
    const userId = existing.rows[0].id;
    await withTenant(input.tenantId, (db) =>
      db.query(
        `UPDATE tenant_user SET role = 'admin', status = 'active', updated_at = now() WHERE id = $1`,
        [userId],
      ),
    );
    logger.info('platform.tenant_admin_promoted', { tenantId: input.tenantId, userId });
    return { userId, created: false, emailSent: false };
  }

  const invited = await inviteMember(
    { host, tenantName, email, displayName: input.displayName, role: 'admin' },
    provider,
  );
  return {
    userId: invited.userId,
    created: true,
    emailSent: invited.emailSent,
    setPasswordUrl: invited.setPasswordUrl,
  };
}

export interface ResendResult {
  emailSent: boolean;
  setPasswordUrl: string;
}

/** Resends a fresh set-password link to an EXISTING tenant user (e.g. a tenant
 *  admin who lost the original onboarding email). */
export async function resendSetPassword(
  input: { tenantId: string; email: string },
  provider: EmailProvider = getEmailProvider(),
): Promise<ResendResult> {
  const email = (input.email || '').trim();
  if (!email) throw expectedError(ErrorCode.VALIDATION, 'email_required');
  const { host, tenantName } = await tenantContext(input.tenantId);

  const found = await withTenant(input.tenantId, (db) =>
    db.query<{ id: string; display_name: string | null }>(
      'SELECT id, display_name FROM tenant_user WHERE normalized_email = $1',
      [normalize(email)],
    ),
  );
  const user = found.rows[0];
  if (!user) throw expectedError(ErrorCode.NOT_FOUND, 'user_not_found');

  const token = createResetToken({
    sub: user.id,
    tenantId: input.tenantId,
    ttlSeconds: SET_PASSWORD_TTL_SECONDS,
  });
  const url = setPasswordUrl(host, token);
  const send = await sendSetPasswordEmail(
    { to: email, recipientName: user.display_name, tenantName, setPasswordUrl: url, validDays: 7 },
    input.tenantId,
    provider,
  );
  logger.info('platform.set_password_resent', { tenantId: input.tenantId, userId: user.id, emailSent: send.ok });
  return { emailSent: send.ok, setPasswordUrl: url };
}
