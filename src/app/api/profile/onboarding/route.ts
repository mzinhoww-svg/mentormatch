import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { completeOnboarding, type OnboardingInput } from '../../../../onboarding/onboardingService.js';
import { getProfileView } from '../../../../profile/profileService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseSkills(value: unknown): OnboardingInput['skills'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : '';
      const level = typeof o.level === 'string' ? o.level : undefined;
      return { name, level };
    })
    .filter((s) => s.name.trim().length > 0);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const input: OnboardingInput = {
      intention: body.intention === 'mentor' ? 'mentor' : 'mentee',
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      bio: typeof body.bio === 'string' ? body.bio : undefined,
      linkedinUrl: typeof body.linkedinUrl === 'string' ? body.linkedinUrl : undefined,
      avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : undefined,
      languages: Array.isArray(body.languages) ? body.languages.map((l) => String(l)) : [],
      contactWhatsapp: typeof body.contactWhatsapp === 'string' ? body.contactWhatsapp : undefined,
      whatsappPublic: typeof body.whatsappPublic === 'boolean' ? body.whatsappPublic : undefined,
      skills: parseSkills(body.skills),
    };

    await completeOnboarding(s.tenantId, s.userId, input);
    return json({ ok: true, profile: await getProfileView(s.tenantId, s.userId) });
  } catch (err) {
    return respondError(err);
  }
}
