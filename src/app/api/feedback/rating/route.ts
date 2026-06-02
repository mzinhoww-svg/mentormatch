import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { getAverageRating } from '../../../../feedback/feedbackService.js';
import { TARGET_TYPES, type TargetType } from '../../../../feedback/rules.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Aggregate rating for a target: ?targetType=&targetId= (no comments returned). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const url = new URL(request.url);
    const targetType = url.searchParams.get('targetType') ?? '';
    const targetId = url.searchParams.get('targetId') ?? '';
    if (!TARGET_TYPES.includes(targetType as TargetType) || !targetId) {
      throw expectedError(ErrorCode.VALIDATION, 'invalid_target');
    }
    return json({ rating: await getAverageRating(s.tenantId, targetType as TargetType, targetId) });
  } catch (err) {
    return respondError(err);
  }
}
