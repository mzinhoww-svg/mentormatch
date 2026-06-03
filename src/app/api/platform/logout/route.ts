import { clearPlatformCookie } from '../../../../auth/cookies.js';
import { jsonWithCookie } from '../../../../auth/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Clears the platform-console cookie. */
export async function POST(): Promise<Response> {
  return jsonWithCookie({ ok: true }, clearPlatformCookie(), 200);
}
