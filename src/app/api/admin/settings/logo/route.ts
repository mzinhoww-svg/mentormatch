import { put } from '@vercel/blob';
import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { setTenantLogo } from '../../../../../settings/settingsService.js';
import { validateLogoUpload } from '../../../../../settings/logoUpload.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Uploads a tenant logo to Vercel Blob and stores its public URL (admin only,
 * tenant-scoped). The object key is namespaced per tenant; type/size are
 * validated before any upload. The stored URL is rendered via <img> only, so an
 * SVG logo cannot execute script in the app's origin.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw expectedError(ErrorCode.INTERNAL, 'blob_not_configured');
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      throw expectedError(ErrorCode.VALIDATION, 'no_file');
    }
    const ext = validateLogoUpload({ type: file.type, size: file.size });
    const key = `tenants/${s.tenantId}/logo-${Date.now()}.${ext}`;
    let blob;
    try {
      blob = await put(key, file, {
        access: 'public',
        contentType: file.type,
        addRandomSuffix: true,
      });
    } catch (e) {
      throw expectedError(
        ErrorCode.DEPENDENCY,
        `blob_upload_failed: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`,
      );
    }
    const settings = await setTenantLogo(s.tenantId, s.userId, blob.url);
    return json({ ok: true, url: blob.url, settings });
  } catch (err) {
    return respondError(err);
  }
}

/** Removes the tenant logo (admin). */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const settings = await setTenantLogo(s.tenantId, s.userId, null);
    return json({ ok: true, settings });
  } catch (err) {
    return respondError(err);
  }
}
