import { requirePlatformAdmin } from '../../../../platform/requirePlatformAdmin.js';
import { listTenants } from '../../../../tenancy/admin.js';
import { getUsageForTenants } from '../../../../platform/usage.js';
import { recordPlatformEvent } from '../../../../platform/audit.js';
import { provisionRealTenant } from '../../../../provisioning/provisioningService.js';
import { json, respondError } from '../../../../auth/http.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';
import { logger } from '../../../../observability/logger.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists all tenants with lightweight usage counts (platform admin). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requirePlatformAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const tenants = await listTenants();
    const usage = await getUsageForTenants(tenants.map((t) => t.id));
    return json({ tenants: tenants.map((t) => ({ ...t, usage: usage[t.id] })) });
  } catch (err) {
    return respondError(err);
  }
}

/** Provisions a real (production) tenant from the console (platform admin). */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requirePlatformAdmin(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const slug = str(body.slug);
    const name = str(body.name);
    const adminEmail = str(body.adminEmail);
    if (!slug || !name || !adminEmail) {
      throw expectedError(ErrorCode.VALIDATION, 'slug_name_admin_email_required');
    }
    const result = await provisionRealTenant({
      slug,
      name,
      adminEmail,
      adminName: str(body.adminName),
      branding: {
        programName: str(body.programName),
        primaryColor: str(body.primaryColor),
        secondaryColor: str(body.secondaryColor),
        locale: str(body.locale),
        logoUrl: str(body.logoUrl),
      },
    });
    logger.info('platform.tenant_provisioned', {
      adminId: admin.id,
      tenantId: result.tenant.id,
      alreadyExisted: result.alreadyExisted,
      emailSent: result.emailSent,
    });
    if (!result.alreadyExisted) {
      await recordPlatformEvent(result.tenant.id, 'platform.tenant_provisioned', {
        adminId: admin.id,
        targetId: result.admin.id,
        metadata: { slug: result.tenant.slug, emailSent: result.emailSent },
      });
    }
    return json(
      {
        ok: true,
        alreadyExisted: result.alreadyExisted,
        tenant: { id: result.tenant.id, slug: result.tenant.slug, name: result.tenant.name },
        emailSent: result.emailSent,
        setPasswordUrl: result.setPasswordUrlProd,
      },
      result.alreadyExisted ? 200 : 201,
    );
  } catch (err) {
    return respondError(err);
  }
}
