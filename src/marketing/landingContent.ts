/**
 * Per-tenant landing copy (pure, no I/O). Optional, admin-authored details that
 * make the employee landing specific to the company's program — niche, the big
 * transformation, the method, the ideal audience, and real testimonials. Stored
 * as a sanitized JSON blob on tenant_settings.landing; absent/blank fields fall
 * back to the generic copy in buildTenantLanding, so the landing always works.
 */
export interface LandingTestimonial {
  quote: string;
  author: string;
  role: string;
}

export interface TenantLandingContent {
  /** Focus area of the program, e.g. "liderança técnica". */
  niche: string | null;
  /** The big personal/professional transformation the program enables. */
  transformation: string | null;
  /** Short summary of the method / how it works. */
  methodology: string | null;
  /** Who the program is ideal for (internal audience). */
  audience: string | null;
  /** Real (admin-provided) testimonials that replace the generic ones. */
  testimonials: LandingTestimonial[];
}

/** What an admin form may submit (same shape, loosely typed for sanitization). */
export type LandingContentInput = Partial<{
  niche: unknown;
  transformation: unknown;
  methodology: unknown;
  audience: unknown;
  testimonials: unknown;
}>;

export const EMPTY_LANDING_CONTENT: TenantLandingContent = {
  niche: null,
  transformation: null,
  methodology: null,
  audience: null,
  testimonials: [],
};

const LIMIT = { text: 600, quote: 400, author: 80, role: 120, testimonials: 4 } as const;

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function toTestimonial(v: unknown): LandingTestimonial | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const quote = str(o.quote, LIMIT.quote);
  if (!quote) return null; // a testimonial without a quote is meaningless
  return {
    quote,
    author: str(o.author, LIMIT.author) ?? 'Colaborador(a)',
    role: str(o.role, LIMIT.role) ?? '',
  };
}

/**
 * Normalizes raw input (a parsed jsonb blob or an admin form payload) into a
 * safe TenantLandingContent: trims, caps lengths, and keeps only valid
 * testimonials (a quote is required), capped in count.
 */
export function resolveLandingContent(raw: unknown): TenantLandingContent {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(o.testimonials) ? o.testimonials : [];
  const testimonials = list
    .map(toTestimonial)
    .filter((t): t is LandingTestimonial => t !== null)
    .slice(0, LIMIT.testimonials);
  return {
    niche: str(o.niche, LIMIT.text),
    transformation: str(o.transformation, LIMIT.text),
    methodology: str(o.methodology, LIMIT.text),
    audience: str(o.audience, LIMIT.text),
    testimonials,
  };
}

export function isLandingContentEmpty(c: TenantLandingContent): boolean {
  return (
    !c.niche && !c.transformation && !c.methodology && !c.audience && c.testimonials.length === 0
  );
}
