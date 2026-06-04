import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import {
  listCustomDomains,
  addCustomDomain,
  removeCustomDomain,
} from '../../../../tenancy/customDomainService.js';
import { verifyRecordName, verifyRecordValue } from '../../../../tenancy/customDomain.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists the tenant's custom domains (admin). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    return json({ domains: await listCustomDomains(s.tenantId) });
  } catch (err) {
    return respondError(err);
  }
}

/** Adds a custom domain and returns the DNS-TXT record to publish (admin). */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const domain = typeof body.domain === 'string' ? body.domain : '';
    if (!domain) throw expectedError(ErrorCode.VALIDATION, 'domain_required');
    const d = await addCustomDomain(s.tenantId, domain);
    return json(
      {
        ok: true,
        domain: d,
        dns: {
          type: 'TXT',
          name: verifyRecordName(d.domain),
          value: verifyRecordValue(d.verificationToken ?? ''),
        },
      },
      201,
    );
  } catch (err) {
    return respondError(err);
  }
}

/** Removes a custom domain (admin). */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const domain = typeof body.domain === 'string' ? body.domain : '';
    if (!domain) throw expectedError(ErrorCode.VALIDATION, 'domain_required');
    await removeCustomDomain(s.tenantId, domain);
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
