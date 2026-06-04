import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { getSettings, updateSettings } from '../../../../settings/settingsService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns the tenant's resolved settings & branding (admin). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    return json({ settings: await getSettings(s.tenantId) });
  } catch (err) {
    return respondError(err);
  }
}

/** Updates branding / operational settings (admin). */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const str = (v: unknown) => (v === undefined ? undefined : v === null ? null : String(v));
    const settings = await updateSettings(s.tenantId, s.userId, {
      displayName: str(body.displayName),
      logoUrl: str(body.logoUrl),
      primaryColor: str(body.primaryColor),
      secondaryColor: str(body.secondaryColor),
      fontFamily: str(body.fontFamily),
      borderRadius: str(body.borderRadius),
      programName: str(body.programName),
      locale: body.locale !== undefined ? String(body.locale) : undefined,
      allowSelfSignup: typeof body.allowSelfSignup === 'boolean' ? body.allowSelfSignup : undefined,
      defaultMentorCapacity:
        typeof body.defaultMentorCapacity === 'number' ? body.defaultMentorCapacity : undefined,
    });
    return json({ ok: true, settings });
  } catch (err) {
    return respondError(err);
  }
}
