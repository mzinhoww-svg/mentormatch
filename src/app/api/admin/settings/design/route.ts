import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';
import { parseDesignMarkdown } from '../../../../../branding/designParser.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CHARS = 200_000;

/**
 * Parses an uploaded DESIGN.md and returns the extracted branding tokens for
 * preview. Does NOT persist — the admin reviews the result and then saves via
 * the normal settings endpoint. Admin-only. Accepts multipart (`file`) or JSON
 * (`{ markdown }`).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));

    let markdown = '';
    const ctype = request.headers.get('content-type') ?? '';
    if (ctype.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw expectedError(ErrorCode.VALIDATION, 'file_required');
      if (file.size > MAX_CHARS) throw expectedError(ErrorCode.VALIDATION, 'file_too_large');
      markdown = await file.text();
    } else {
      const body = (await request.json().catch(() => ({}))) as { markdown?: unknown };
      markdown = typeof body.markdown === 'string' ? body.markdown : '';
    }
    if (!markdown.trim()) throw expectedError(ErrorCode.VALIDATION, 'empty_markdown');

    const parsed = parseDesignMarkdown(markdown.slice(0, MAX_CHARS));
    return json({ ok: true, parsed });
  } catch (err) {
    return respondError(err);
  }
}
