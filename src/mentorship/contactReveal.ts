/**
 * Controlled ContactInfo reveal. A user may see another user's contact details
 * ONLY when an ACTIVE mentorship links them (i.e. after an accepted match).
 * Otherwise the contact stays hidden. Each successful reveal is audited
 * (contact_info.revealed) — recording THAT it happened, never the raw value.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordMentorshipEvent } from './audit.js';

export interface RevealedContact {
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
}

export async function revealContact(
  tenantId: string,
  viewerId: string,
  otherUserId: string,
): Promise<RevealedContact> {
  const contact = await withTenant(tenantId, async (db) => {
    const link = await db.query(
      `SELECT 1 FROM mentorship
       WHERE status = 'active'
         AND ((mentor_id = $1 AND mentee_id = $2) OR (mentor_id = $2 AND mentee_id = $1))
       LIMIT 1`,
      [viewerId, otherUserId],
    );
    if (link.rowCount === 0) {
      throw expectedError(ErrorCode.FORBIDDEN, 'contact_not_revealed');
    }
    const res = await db.query<RevealedContact>(
      `SELECT contact_email AS "contactEmail", contact_phone AS "contactPhone",
              contact_whatsapp AS "contactWhatsapp"
       FROM tenant_user WHERE id = $1`,
      [otherUserId],
    );
    return res.rows[0] ?? { contactEmail: null, contactPhone: null, contactWhatsapp: null };
  });

  await recordMentorshipEvent(tenantId, 'contact_info.revealed', {
    actorId: viewerId,
    targetId: otherUserId,
    targetType: 'tenant_user',
  });
  return contact;
}
