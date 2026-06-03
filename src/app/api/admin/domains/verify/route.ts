import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { verifyCustomDomain } from '../../../../../tenancy/customDomainService.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Checks the DNS-TXT record and marks the tenant's domain verified (admin). */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const domain = typeof body.domain === 'string' ? body.domain : '';
    if (!domain) throw expectedError(ErrorCode.VALIDATION, 'domain_required');
    const d = await verifyCustomDomain(s.tenantId, domain);
    return json({ ok: true, domain: d });
  } catch (err) {
    return respondError(err);
  }
}
