import { requirePlatformAdmin } from '../../../../../platform/requirePlatformAdmin.js';
import { parseDesignFile } from '../../../../../platform/designFile.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DESIGN_BYTES = 256 * 1024;

/**
 * Parses an uploaded design file (JSON or markdown/text) into branding fields
 * the console prefills. Does NOT persist — the admin reviews and saves. Platform
 * admin only.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await requirePlatformAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') throw expectedError(ErrorCode.VALIDATION, 'no_file');
    if (file.size > MAX_DESIGN_BYTES) throw expectedError(ErrorCode.VALIDATION, 'file_too_large');
    const text = await file.text();
    return json({ ok: true, parsed: parseDesignFile(text) });
  } catch (err) {
    return respondError(err);
  }
}
