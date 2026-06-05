import { requirePlatformAdmin } from '../../../../../platform/requirePlatformAdmin.js';
import { getOverview } from '../../../../../admin/adminService.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operational overview/statistics for a specific tenant (platform admin). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requirePlatformAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const tenantId = new URL(request.url).searchParams.get('tenantId') ?? '';
    if (!tenantId) throw expectedError(ErrorCode.VALIDATION, 'tenantId_required');
    return json({ overview: await getOverview(tenantId) });
  } catch (err) {
    return respondError(err);
  }
}
