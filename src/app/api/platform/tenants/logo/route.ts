import { put } from '@vercel/blob';
import { requirePlatformAdmin } from '../../../../../platform/requirePlatformAdmin.js';
import { setTenantLogo } from '../../../../../settings/settingsService.js';
import { validateLogoUpload } from '../../../../../settings/logoUpload.js';
import { recordPlatformEvent } from '../../../../../platform/audit.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Uploads a logo for a specific tenant (platform admin). */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requirePlatformAdmin(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw expectedError(ErrorCode.INTERNAL, 'blob_not_configured');
    }
    const form = await request.formData();
    const tenantId = String(form.get('tenantId') ?? '');
    const file = form.get('file');
    if (!tenantId) throw expectedError(ErrorCode.VALIDATION, 'tenantId_required');
    if (!file || typeof file === 'string') throw expectedError(ErrorCode.VALIDATION, 'no_file');
    const ext = validateLogoUpload({ type: file.type, size: file.size });
    const key = `tenants/${tenantId}/logo-${Date.now()}.${ext}`;
    let blob;
    try {
      blob = await put(key, file, {
        access: 'public',
        contentType: file.type,
        addRandomSuffix: true,
      });
    } catch (e) {
      // Surface the real Vercel Blob failure (redacted) instead of a generic 500.
      throw expectedError(
        ErrorCode.DEPENDENCY,
        `blob_upload_failed: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`,
      );
    }
    const settings = await setTenantLogo(tenantId, admin.id, blob.url);
    await recordPlatformEvent(tenantId, 'platform.tenant_logo_changed', { adminId: admin.id });
    return json({ ok: true, url: blob.url, settings });
  } catch (err) {
    return respondError(err);
  }
}

/** Removes a specific tenant's logo (platform admin). */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const admin = await requirePlatformAdmin(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId : '';
    if (!tenantId) throw expectedError(ErrorCode.VALIDATION, 'tenantId_required');
    const settings = await setTenantLogo(tenantId, admin.id, null);
    await recordPlatformEvent(tenantId, 'platform.tenant_logo_changed', {
      adminId: admin.id,
      metadata: { removed: true },
    });
    return json({ ok: true, settings });
  } catch (err) {
    return respondError(err);
  }
}
