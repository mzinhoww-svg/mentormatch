'use client';
/**
 * First-login onboarding wizard (4 steps). Intention first (mentor/mentee),
 * then the essential profile, then skills/interests tailored to the intention,
 * then a celebratory done screen with a profile-completeness score. Everything
 * is collected in local state and committed in a single POST to
 * /api/profile/onboarding; only the avatar uploads eagerly (to get its URL).
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { errorMessage, initials } from '../components.js';
import { COMMON_LANGUAGES } from '../../profile/languages.js';
import { profileCompleteness } from '../../profile/completeness.js';

export interface OnboardingContext {
  displayName: string;
  firstName: string;
  email: string;
  company: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  languages: string[];
  contactWhatsapp: string | null;
  whatsappPublic: boolean;
}

type Intention = 'mentor' | 'mentee';
interface CatalogSkill { id: string; name: string }
interface PickedSkill { name: string; level?: string }

const SKILL_LEVELS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'avancado', label: 'Avançado' },
];

const STEP_PROGRESS = [0, 50, 100, 100];

export function OnboardingWizard({ context }: { context: OnboardingContext }) {
  const [step, setStep] = useState(0);
  const [intention, setIntention] = useState<Intention | null>(null);
  const [exploring, setExploring] = useState(false);

  const [displayName, setDisplayName] = useState(context.displayName);
  const [title, setTitle] = useState(context.title ?? '');
  const [bio, setBio] = useState(context.bio ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(context.linkedinUrl ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(context.avatarUrl);
  const [languages, setLanguages] = useState<string[]>(context.languages ?? []);
  const [whatsapp, setWhatsapp] = useState(context.contactWhatsapp ?? '');
  const [whatsappPublic, setWhatsappPublic] = useState(context.whatsappPublic);
  const [skills, setSkills] = useState<PickedSkill[]>([]);

  const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<{ skills: CatalogSkill[] }>('/api/skills')
      .then((r) => setCatalog(r.skills ?? []))
      .catch(() => setCatalog([]));
  }, []);

  function chooseIntention(value: Intention, isExploring: boolean) {
    setIntention(value);
    setExploring(isExploring);
    setStep(1);
  }

  async function finish() {
    if (!intention) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/api/profile/onboarding', {
        intention,
        displayName,
        title,
        bio,
        linkedinUrl,
        avatarUrl,
        languages,
        contactWhatsapp: whatsapp,
        whatsappPublic,
        skills,
      });
      setStep(3);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const completeness = profileCompleteness({
    avatarUrl,
    title,
    bio,
    linkedinUrl,
    languages,
    contactWhatsapp: whatsapp,
    skillCount: skills.length,
    hasIntention: intention !== null,
  });

  return (
    <div className="ob-shell">
      <header className="ob-top">
        <span className="ob-top-brand">{context.company}</span>
        {step < 3 ? <span className="ob-top-step">Passo {step + 1} de 3</span> : null}
      </header>

      {step < 3 ? (
        <div className="ob-progress" role="progressbar" aria-valuenow={STEP_PROGRESS[step]} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${STEP_PROGRESS[step]}%` }} />
        </div>
      ) : null}

      <main className="ob-main">
        {error ? <div className="ob-error" role="alert">{error}</div> : null}

        {step === 0 ? (
          <IntentionStep context={context} onChoose={chooseIntention} />
        ) : null}

        {step === 1 ? (
          <ProfileStep
            context={context}
            displayName={displayName} setDisplayName={setDisplayName}
            title={title} setTitle={setTitle}
            bio={bio} setBio={setBio}
            linkedinUrl={linkedinUrl} setLinkedinUrl={setLinkedinUrl}
            avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl}
            languages={languages} setLanguages={setLanguages}
            whatsapp={whatsapp} setWhatsapp={setWhatsapp}
            whatsappPublic={whatsappPublic} setWhatsappPublic={setWhatsappPublic}
            onError={setError}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        ) : null}

        {step === 2 && intention ? (
          <SkillsStep
            intention={intention}
            catalog={catalog}
            skills={skills} setSkills={setSkills}
            submitting={submitting}
            onBack={() => setStep(1)}
            onFinish={finish}
          />
        ) : null}

        {step === 3 && intention ? (
          <DoneStep context={context} intention={intention} exploring={exploring} completeness={completeness} />
        ) : null}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- Etapa 0 */

function IntentionStep({
  context, onChoose,
}: {
  context: OnboardingContext;
  onChoose: (v: Intention, exploring: boolean) => void;
}) {
  return (
    <section className="ob-step ob-welcome">
      <p className="ob-eyebrow">Sua jornada começa agora</p>
      <h1 className="ob-h1">Bem-vindo(a) ao seu MentorMatch, {context.firstName}!</h1>
      <p className="ob-lead">
        A {context.company} investiu no seu crescimento. Para começar, como você gostaria de
        participar?
      </p>

      <dl className="ob-identity" aria-label="Seus dados">
        <div><dt>Nome</dt><dd>{context.displayName}</dd></div>
        <div><dt>E-mail</dt><dd>{context.email}</dd></div>
        <div><dt>Empresa</dt><dd>{context.company}</dd></div>
      </dl>

      <div className="ob-choices">
        <button type="button" className="ob-choice" onClick={() => onChoose('mentee', false)}>
          <span className="ob-choice-t">Quero ser mentorado(a)</span>
          <span className="ob-choice-d">Busque orientação, aprenda novas habilidades e acelere seu desenvolvimento.</span>
        </button>
        <button type="button" className="ob-choice" onClick={() => onChoose('mentor', false)}>
          <span className="ob-choice-t">Quero ser mentor(a)</span>
          <span className="ob-choice-d">Compartilhe seu conhecimento, guie colegas e reforce sua liderança.</span>
        </button>
      </div>

      <button type="button" className="ob-explore" onClick={() => onChoose('mentee', true)}>
        Explorar como mentorado(a) primeiro
        <span className="ob-explore-note">Você pode se tornar mentor(a) a qualquer momento.</span>
      </button>
    </section>
  );
}

/* ---------------------------------------------------------------- Etapa 1 */

function ProfileStep(props: {
  context: OnboardingContext;
  displayName: string; setDisplayName: (v: string) => void;
  title: string; setTitle: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  linkedinUrl: string; setLinkedinUrl: (v: string) => void;
  avatarUrl: string | null; setAvatarUrl: (v: string | null) => void;
  languages: string[]; setLanguages: (v: string[]) => void;
  whatsapp: string; setWhatsapp: (v: string) => void;
  whatsappPublic: boolean; setWhatsappPublic: (v: boolean) => void;
  onError: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const {
    context, displayName, setDisplayName, title, setTitle, bio, setBio,
    linkedinUrl, setLinkedinUrl, avatarUrl, setAvatarUrl, languages, setLanguages,
    whatsapp, setWhatsapp, whatsappPublic, setWhatsappPublic, onError, onBack, onNext,
  } = props;

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.upload<{ url: string }>('/api/profile/avatar', fd);
      setAvatarUrl(r.url);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <section className="ob-step">
      <h1 className="ob-h1">Complete seu perfil para conectar-se</h1>
      <p className="ob-lead">Quanto mais completo, mais fácil encontrar as conexões certas. Tudo é editável depois.</p>

      <div className="ob-avatar-row">
        <span className="ob-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="Sua foto de perfil" /> : initials(displayName || context.firstName || '?')}
        </span>
        <div>
          <input ref={fileRef} id="ob-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickFile} style={{ display: 'none' }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Enviando…' : avatarUrl ? 'Trocar foto' : 'Enviar foto'}
          </button>
          <p className="ob-hint">Opcional · JPG, PNG ou WebP até 2 MB. Perfis com foto engajam mais.</p>
        </div>
      </div>

      <div className="ob-field">
        <label htmlFor="ob-name">Nome de exibição</label>
        <input id="ob-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <div className="ob-field">
        <label htmlFor="ob-title">Cargo / função</label>
        <input id="ob-title" className="input" placeholder="Ex.: Analista de Produto" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="ob-field">
        <label htmlFor="ob-langs">Idiomas que você fala</label>
        <ChipPicker
          id="ob-langs"
          value={languages}
          onChange={setLanguages}
          suggestions={COMMON_LANGUAGES}
          placeholder="Português, Inglês…"
          ariaLabel="Idiomas que você fala"
        />
      </div>

      <div className="ob-field">
        <label htmlFor="ob-bio">Breve biografia</label>
        <textarea id="ob-bio" className="textarea" maxLength={400}
          placeholder="Conte um pouco sobre sua trajetória, paixões e o que te motiva."
          value={bio} onChange={(e) => setBio(e.target.value)} />
        <span className="ob-count">{bio.length}/400</span>
      </div>

      <div className="ob-field">
        <label htmlFor="ob-linkedin">LinkedIn</label>
        <input id="ob-linkedin" className="input" type="url" placeholder="https://linkedin.com/in/voce" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
      </div>

      <div className="ob-field">
        <label htmlFor="ob-wa">WhatsApp</label>
        <input id="ob-wa" className="input" placeholder="(DDD) 9xxxx-xxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        <label className="ob-check">
          <input type="checkbox" checked={whatsappPublic} onChange={(e) => setWhatsappPublic(e.target.checked)} />
          Tornar meu WhatsApp visível publicamente no meu perfil
        </label>
      </div>

      <div className="ob-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>Voltar</button>
        <button type="button" className="btn btn-primary" onClick={onNext}>Continuar</button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Etapa 2 */

function SkillsStep({
  intention, catalog, skills, setSkills, submitting, onBack, onFinish,
}: {
  intention: Intention;
  catalog: CatalogSkill[];
  skills: PickedSkill[];
  setSkills: (v: PickedSkill[]) => void;
  submitting: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  const isMentor = intention === 'mentor';
  const [level, setLevel] = useState('');

  const names = skills.map((s) => s.name);
  function add(name: string) {
    const clean = name.trim();
    if (!clean) return;
    if (names.some((n) => n.toLowerCase() === clean.toLowerCase())) return;
    setSkills([...skills, { name: clean, ...(isMentor && level ? { level } : {}) }]);
  }
  function remove(name: string) {
    setSkills(skills.filter((s) => s.name !== name));
  }

  return (
    <section className="ob-step">
      <h1 className="ob-h1">{isMentor ? 'Quais habilidades você pode compartilhar?' : 'O que você busca aprender?'}</h1>
      <p className="ob-lead">
        {isMentor
          ? 'Selecione as áreas onde você tem expertise. Seja específico para atrair os mentorados certos.'
          : 'Selecione as áreas onde você busca orientação e crescimento.'}
      </p>

      {isMentor ? (
        <div className="ob-field">
          <label htmlFor="ob-level">Nível (para a próxima habilidade)</label>
          <select id="ob-level" className="input" value={level} onChange={(e) => setLevel(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">Sem nível</option>
            {SKILL_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      ) : null}

      <div className="ob-field">
        <label htmlFor="ob-skills">{isMentor ? 'Habilidades' : 'Interesses'}</label>
        <ChipPicker
          id="ob-skills"
          value={names}
          chips={skills.map((s) => ({ label: s.name, sub: s.level ? SKILL_LEVELS.find((l) => l.value === s.level)?.label : undefined }))}
          onAdd={add}
          onRemove={remove}
          suggestions={catalog.map((c) => c.name)}
          placeholder={isMentor ? 'Ex.: Liderança, Gestão de produto…' : 'Ex.: Carreira, Comunicação…'}
          ariaLabel={isMentor ? 'Habilidades que você compartilha' : 'O que você busca aprender'}
        />
      </div>

      <div className="ob-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>Voltar</button>
        <button type="button" className="btn btn-primary" onClick={onFinish} disabled={submitting}>
          {submitting ? 'Finalizando…' : 'Finalizar perfil'}
        </button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Etapa 3 */

function DoneStep({
  context, intention, exploring, completeness,
}: {
  context: OnboardingContext;
  intention: Intention;
  exploring: boolean;
  completeness: { percent: number; missing: { key: string; label: string }[] };
}) {
  const isMentor = intention === 'mentor' && !exploring;
  return (
    <section className="ob-step ob-done">
      <div className="ob-badge" aria-hidden>✓</div>
      <h1 className="ob-h1">Parabéns, {context.firstName}! Seu perfil está pronto.</h1>
      <p className="ob-lead">
        Você desbloqueou o MentorMatch. {isMentor
          ? 'Agora colegas podem encontrar você e pedir mentoria.'
          : 'Agora você pode explorar mentores e começar sua jornada de desenvolvimento.'}
      </p>

      <div className="ob-score">
        <div className="ob-score-bar"><span style={{ width: `${completeness.percent}%` }} /></div>
        <p className="ob-score-label">Perfil {completeness.percent}% completo</p>
        {completeness.missing.length > 0 ? (
          <p className="ob-hint">Para chegar a 100%: {completeness.missing.map((m) => m.label.toLowerCase()).join(' · ')}.</p>
        ) : null}
      </div>

      <div className="ob-actions ob-actions-center">
        {isMentor ? (
          <a className="btn btn-primary" href="/app">Ir para o início</a>
        ) : (
          <a className="btn btn-primary" href="/app/mentors">Explorar mentores</a>
        )}
        <a className="btn btn-ghost" href="/app/profile">Ajustar meu perfil</a>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- ChipPicker */

/**
 * Minimal multi-select with free text + suggestions. Two modes:
 *  - simple: pass value:string[] + onChange (used for languages).
 *  - rich:   pass chips (with optional sub-label) + onAdd/onRemove (skills).
 */
function ChipPicker({
  id, value, onChange, chips, onAdd, onRemove, suggestions, placeholder, ariaLabel,
}: {
  id: string;
  value: string[];
  onChange?: (v: string[]) => void;
  chips?: { label: string; sub?: string }[];
  onAdd?: (name: string) => void;
  onRemove?: (name: string) => void;
  suggestions: readonly string[];
  placeholder?: string;
  ariaLabel: string;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const items = chips ?? value.map((v) => ({ label: v, sub: undefined as string | undefined }));
  const have = new Set(value.map((v) => v.toLowerCase()));
  const typed = text.trim();
  const matches = suggestions
    .filter((s) => !have.has(s.toLowerCase()))
    .filter((s) => (typed ? s.toLowerCase().includes(typed.toLowerCase()) : true))
    .slice(0, 8);
  const exists = suggestions.some((s) => s.toLowerCase() === typed.toLowerCase()) || have.has(typed.toLowerCase());
  const canCreate = typed.length > 0 && !exists;

  function add(name: string) {
    const clean = name.trim().replace(/,+$/, '').trim();
    if (!clean) return;
    if (onAdd) onAdd(clean);
    else if (onChange && !have.has(clean.toLowerCase())) onChange([...value, clean]);
    setText('');
    setOpen(false);
  }
  function remove(name: string) {
    if (onRemove) onRemove(name);
    else if (onChange) onChange(value.filter((v) => v !== name));
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="ob-chips" ref={boxRef}>
      {items.length > 0 ? (
        <div className="ob-chip-list">
          {items.map((c) => (
            <span key={c.label} className="ob-chip">
              {c.label}{c.sub ? <em>{c.sub}</em> : null}
              <button type="button" onClick={() => remove(c.label)} aria-label={`Remover ${c.label}`}>×</button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="ob-chip-input">
        <input
          id={id}
          className="input"
          value={text}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={open}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            setOpen(true);
            if (v.includes(',')) {
              const parts = v.split(',');
              const last = parts.pop() ?? '';
              for (const seg of parts) if (seg.trim()) add(seg);
              setText(last);
            } else {
              setText(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) add(matches[0]); else if (canCreate) add(typed); }
            else if (e.key === 'Escape') setOpen(false);
          }}
        />
        {open && (matches.length > 0 || canCreate) ? (
          <div className="ob-suggest" role="listbox">
            {matches.map((m) => (
              <button key={m} type="button" role="option" onClick={() => add(m)}>{m}</button>
            ))}
            {canCreate ? <button type="button" className="new" onClick={() => add(typed)}>Adicionar “{typed}”</button> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
