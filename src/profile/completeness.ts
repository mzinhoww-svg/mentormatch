/**
 * Profile completeness (pure). Drives the "perfil X% completo" indicator shown
 * after onboarding and on the profile screen. Weighted so the high-value fields
 * (a photo, what you can teach/learn) matter more than the optional ones. No I/O.
 */
export interface CompletenessInput {
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  languages: readonly string[];
  contactWhatsapp: string | null;
  /** offered (mentor) + sought (mentee) skills the user has attached. */
  skillCount: number;
  /** has picked a side: offers mentoring OR is seeking at least one skill. */
  hasIntention: boolean;
}

interface Criterion {
  key: string;
  label: string;
  weight: number;
  done: (i: CompletenessInput) => boolean;
}

const CRITERIA: readonly Criterion[] = [
  { key: 'intention', label: 'Escolher como participar', weight: 2, done: (i) => i.hasIntention },
  { key: 'skills', label: 'Adicionar habilidades ou interesses', weight: 2, done: (i) => i.skillCount > 0 },
  { key: 'avatar', label: 'Adicionar uma foto de perfil', weight: 2, done: (i) => Boolean(i.avatarUrl) },
  { key: 'title', label: 'Informar seu cargo', weight: 1, done: (i) => Boolean(i.title && i.title.trim()) },
  { key: 'bio', label: 'Escrever uma breve biografia', weight: 1, done: (i) => Boolean(i.bio && i.bio.trim()) },
  { key: 'languages', label: 'Informar os idiomas que você fala', weight: 1, done: (i) => i.languages.length > 0 },
  { key: 'linkedin', label: 'Adicionar seu LinkedIn', weight: 1, done: (i) => Boolean(i.linkedinUrl && i.linkedinUrl.trim()) },
];

export interface Completeness {
  percent: number; // 0–100
  missing: { key: string; label: string }[];
}

export function profileCompleteness(input: CompletenessInput): Completeness {
  const total = CRITERIA.reduce((s, c) => s + c.weight, 0);
  let earned = 0;
  const missing: { key: string; label: string }[] = [];
  for (const c of CRITERIA) {
    if (c.done(input)) earned += c.weight;
    else missing.push({ key: c.key, label: c.label });
  }
  return { percent: Math.round((earned / total) * 100), missing };
}
