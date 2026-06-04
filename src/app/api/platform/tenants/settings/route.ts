import { requirePlatformAdmin } from '../../../../../platform/requirePlatformAdmin.js';
import { getSettings, updateSettings } from '../../../../../settings/settingsService.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Reads a specific tenant's settings/branding (platform admin). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requirePlatformAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const tenantId = new URL(request.url).searchParams.get('tenantId') ?? '';
    if (!tenantId) throw expectedError(ErrorCode.VALIDATION, 'tenantId_required');
    return json({ settings: await getSettings(tenantId) });
  } catch (err) {
    return respondError(err);
  }
}

/** Updates a specific tenant's branding (platform admin). */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requirePlatformAdmin(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId : '';
    if (!tenantId) throw expectedError(ErrorCode.VALIDATION, 'tenantId_required');
    const str = (v: unknown) => (v === undefined ? undefined : v === null ? null : String(v));
    const settings = await updateSettings(tenantId, admin.id, {
      displayName: str(body.displayName),
      primaryColor: str(body.primaryColor),
      secondaryColor: str(body.secondaryColor),
      programName: str(body.programName),
    });
    return json({ ok: true, settings });
  } catch (err) {
    return respondError(err);
  }
}
