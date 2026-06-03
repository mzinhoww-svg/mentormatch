import { requirePlatformAdmin } from '../../../../../platform/requirePlatformAdmin.js';
import { setTenantRegistryStatus } from '../../../../../tenancy/admin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';
import { logger } from '../../../../../observability/logger.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Suspends or reactivates a tenant by setting the REGISTRY status (what gates
 * login). Platform admin only.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requirePlatformAdmin(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId : '';
    const status =
      body.status === 'suspended' ? 'suspended' : body.status === 'active' ? 'active' : null;
    if (!tenantId || !status) throw expectedError(ErrorCode.VALIDATION, 'invalid_status_request');

    const tenant = await setTenantRegistryStatus(tenantId, status);
    logger.info('platform.tenant_status_changed', { adminId: admin.id, tenantId, status });
    return json({ ok: true, tenant: { id: tenant.id, slug: tenant.slug, status: tenant.status } });
  } catch (err) {
    return respondError(err);
  }
}
