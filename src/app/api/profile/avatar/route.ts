import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';
import { upsertProfile } from '../../../../profile/profileService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Uploads a profile photo to Vercel Blob and stores its URL on the profile.
 * Uses the Blob REST API via fetch (no SDK dependency). Expects a multipart
 * form-data body with a single `file` field. Requires BLOB_READ_WRITE_TOKEN.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw expectedError(ErrorCode.CONFIG, 'blob_not_configured');

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw expectedError(ErrorCode.VALIDATION, 'file_required');
    if (!ALLOWED.has(file.type)) throw expectedError(ErrorCode.VALIDATION, 'unsupported_type');
    if (file.size > MAX_BYTES) throw expectedError(ErrorCode.VALIDATION, 'file_too_large');

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    // Tenant-scoped, per-user path; randomized suffix avoids collisions/caching issues.
    const pathname = `avatars/${s.tenantId}/${s.userId}-${Date.now()}.${ext}`;

    const res = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'x-content-type': file.type,
        'x-add-random-suffix': '0',
      },
      body: file.stream(),
      // @ts-expect-error Node fetch requires duplex for a streamed body.
      duplex: 'half',
    });
    if (!res.ok) throw expectedError(ErrorCode.DEPENDENCY, 'blob_upload_failed');
    const blob = (await res.json()) as { url: string };

    const profile = await upsertProfile(s.tenantId, s.userId, { avatarUrl: blob.url });
    return json({ ok: true, url: blob.url, profile }, 201);
  } catch (err) {
    return respondError(err);
  }
}
