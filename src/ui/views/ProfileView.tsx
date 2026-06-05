'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, PageHeader, useResource, errorMessage, initials } from '../components.js';
import { profileCompleteness } from '../../profile/completeness.js';

interface Skill {
  id: string;
  skillId: string;
  name: string;
  relation: 'offered' | 'sought' | 'interest';
  level: string | null;
}
interface CatalogSkill { id: string; name: string }
interface Contact {
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactPublic: boolean;
}
interface ProfilePayload {
  profile: {
    bio: string | null;
    title: string | null;
    area: string | null;
    seniority: string | null;
    avatarUrl: string | null;
    linkedinUrl: string | null;
    status: 'active' | 'inactive';
    mentorAvailable: boolean;
    mentorPaused: boolean;
    languages: string[];
  } | null;
  contact: Contact;
  skills: { offered: Skill[]; sought: Skill[]; interest: Skill[] };
  goals: { id: string; description: string }[];
  roles: { isMentor: boolean; isMentee: boolean };
}

const CloseX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
    <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export function ProfileView({ displayName }: { displayName?: string }) {
  const { data, error, loading, reload } = useResource<ProfilePayload>(() => api.get('/api/profile'));
  const catalog = useResource<{ skills: CatalogSkill[] }>(() => api.get('/api/skills'));

  const [form, setForm] = useState({ bio: '', title: '', area: '', seniority: '', linkedinUrl: '' });
  const [contact, setContact] = useState<Contact>({ contactEmail: '', contactPhone: '', contactWhatsapp: '', contactPublic: false } as Contact);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data?.profile) {
      setForm({
        bio: data.profile.bio ?? '',
        title: data.profile.title ?? '',
        area: data.profile.area ?? '',
        seniority: data.profile.seniority ?? '',
        linkedinUrl: data.profile.linkedinUrl ?? '',
      });
    }
    if (data?.contact) {
      setContact({
        contactEmail: data.contact.contactEmail ?? '',
        contactPhone: data.contact.contactPhone ?? '',
        contactWhatsapp: data.contact.contactWhatsapp ?? '',
        contactPublic: data.contact.contactPublic,
      });
    }
  }, [data]);

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  const p = data.profile;

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.put('/api/profile', form);
      setMsg({ kind: 'ok', text: 'Perfil salvo.' });
      reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function saveContact() {
    setMsg(null);
    try {
      await api.put('/api/profile/contact', contact);
      setMsg({ kind: 'ok', text: 'Contato atualizado.' });
      reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.upload('/api/profile/avatar', fd);
      setMsg({ kind: 'ok', text: 'Foto atualizada.' });
      reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function setAvailability(patch: { available?: boolean; paused?: boolean }) {
    await api.post('/api/profile/availability', patch).catch(() => {});
    reload();
  }

  const completeness = profileCompleteness({
    avatarUrl: p?.avatarUrl ?? null,
    title: p?.title ?? null,
    bio: p?.bio ?? null,
    linkedinUrl: p?.linkedinUrl ?? null,
    languages: p?.languages ?? [],
    contactWhatsapp: data.contact.contactWhatsapp,
    skillCount: data.skills.offered.length + data.skills.sought.length,
    hasIntention: (p?.mentorAvailable ?? false) || data.skills.sought.length > 0,
  });

  return (
    <div>
      <PageHeader title="Perfil" subtitle="Mantenha seu perfil completo — é assim que as conexões certas encontram você." />
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      {/* Completeness */}
      {completeness.percent < 100 ? (
        <div className="card pf-complete" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="pf-complete-head">
            <b>Perfil {completeness.percent}% completo</b>
            <span className="muted">Perfis completos recebem mais conexões.</span>
          </div>
          <div className="pf-complete-bar"><span style={{ width: `${completeness.percent}%` }} /></div>
          <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            Falta: {completeness.missing.map((m) => m.label.toLowerCase()).join(' · ')}.
          </p>
        </div>
      ) : null}

      {/* Avatar */}
      <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="pf-avatar-wrap">
          <span className="pf-avatar">
            {p?.avatarUrl ? <img src={p.avatarUrl} alt="Sua foto de perfil" /> : initials(displayName ?? form.title ?? '?')}
          </span>
          <div className="pf-avatar-actions">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickFile} style={{ display: 'none' }} id="avatar-input" />
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Enviando…' : p?.avatarUrl ? 'Trocar foto' : 'Enviar foto'}
            </button>
            <span className="pf-hint">JPG, PNG ou WebP · até 2 MB</span>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 'var(--sp-4)' }}>
        {/* Dados + bio + linkedin */}
        <form className="card" onSubmit={saveProfile}>
          <div className="card-h">Dados</div>
          {(['title', 'area', 'seniority'] as const).map((k) => (
            <div className="field" key={k}>
              <label htmlFor={k}>{k === 'title' ? 'Cargo' : k === 'area' ? 'Área' : 'Senioridade'}</label>
              <input id={k} className="input" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="field">
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" className="textarea" placeholder="Conte sua experiência e como pode ajudar." value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="linkedinUrl">LinkedIn</label>
            <input id="linkedinUrl" className="input" type="url" placeholder="https://linkedin.com/in/voce" value={form.linkedinUrl} onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </form>

        {/* Contato + visibilidade + disponibilidade */}
        <div className="card">
          <div className="card-h">Contato</div>
          <div className="field">
            <label htmlFor="cmail">E-mail</label>
            <input id="cmail" className="input" type="email" value={contact.contactEmail ?? ''} onChange={(e) => setContact((c) => ({ ...c, contactEmail: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="cphone">Telefone</label>
            <input id="cphone" className="input" value={contact.contactPhone ?? ''} onChange={(e) => setContact((c) => ({ ...c, contactPhone: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="cwa">WhatsApp</label>
            <input id="cwa" className="input" placeholder="(DDD) 9xxxx-xxxx" value={contact.contactWhatsapp ?? ''} onChange={(e) => setContact((c) => ({ ...c, contactWhatsapp: e.target.value }))} />
          </div>
          <div className="pf-toggle" style={{ marginBottom: 'var(--sp-4)' }}>
            <div>
              <div className="lab">Contato público</div>
              <div className="sub">Se desligado, só aparece após uma mentoria aceita.</div>
            </div>
            <label className="pf-switch">
              <input type="checkbox" checked={contact.contactPublic} onChange={(e) => setContact((c) => ({ ...c, contactPublic: e.target.checked }))} aria-label="Tornar contato público" />
              <span className="track" />
            </label>
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveContact}>Salvar contato</button>

          <div className="card-h" style={{ marginTop: 'var(--sp-6)' }}>Disponibilidade como mentor</div>
          <p className="muted" style={{ fontSize: 14 }}>Status do perfil: <b>{p?.status === 'active' ? 'ativo' : 'inativo'}</b></p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'var(--sp-3)' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={p?.mentorAvailable ?? false} onChange={(e) => setAvailability({ available: e.target.checked })} />
              Disponível para mentorar
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={p?.mentorPaused ?? false} onChange={(e) => setAvailability({ paused: e.target.checked })} />
              Pausar disponibilidade
            </label>
          </div>
          {p?.status !== 'active' ? (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--sp-4)' }}
              onClick={async () => { await api.post('/api/profile/activate').catch(() => {}); reload(); }}>
              Ativar perfil
            </button>
          ) : null}
        </div>
      </div>

      {/* Skills editor */}
      <div className="grid grid-2" style={{ marginTop: 'var(--sp-4)' }}>
        <SkillEditor title="Habilidades que ofereço" relation="offered" skills={data.skills.offered} catalog={catalog.data?.skills ?? []} onChange={reload} onError={(t) => setMsg({ kind: 'error', text: t })} />
        <SkillEditor title="Habilidades que busco" relation="sought" skills={data.skills.sought} catalog={catalog.data?.skills ?? []} onChange={reload} onError={(t) => setMsg({ kind: 'error', text: t })} />
      </div>
    </div>
  );
}

/** Proficiency levels for OFFERED skills (stored as the level string). */
const SKILL_LEVELS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'avancado', label: 'Avançado' },
];
const LEVEL_LABEL: Record<string, string> = Object.fromEntries(
  SKILL_LEVELS.map((l) => [l.value, l.label]),
);

function SkillEditor({
  title, relation, skills, catalog, onChange, onError,
}: {
  title: string;
  relation: 'offered' | 'sought';
  skills: Skill[];
  catalog: CatalogSkill[];
  onChange: () => void;
  onError: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [openSug, setOpenSug] = useState(false);
  const [active, setActive] = useState(0);
  const [level, setLevel] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  const have = new Set(skills.map((s) => s.name.toLowerCase()));
  const typed = text.trim();
  // Suggestions: catalog skills matching the typed text, not already added.
  const suggestions = catalog
    .filter((c) => !have.has(c.name.toLowerCase()))
    .filter((c) => (typed ? c.name.toLowerCase().includes(typed.toLowerCase()) : true))
    .slice(0, 8);
  const exactExists = catalog.some((c) => c.name.toLowerCase() === typed.toLowerCase()) || have.has(typed.toLowerCase());
  const canCreate = typed.length > 0 && !exactExists;

  // Close suggestions on outside click.
  useEffect(() => {
    if (!openSug) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenSug(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [openSug]);

  async function addByName(name: string) {
    const clean = name.trim().replace(/,+$/, '').trim();
    if (!clean || have.has(clean.toLowerCase())) {
      setText('');
      return;
    }
    const lvl = relation === 'offered' && level ? level : undefined;
    try {
      await api.post('/api/profile/skills', { name: clean, relation, ...(lvl ? { level: lvl } : {}) });
      setText('');
      setOpenSug(false);
      setActive(0);
      onChange();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function remove(userSkillId: string) {
    try {
      await api.del('/api/profile/skills', { userSkillId });
      onChange();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  function onInputChange(v: string) {
    setOpenSug(true);
    setActive(0);
    // A comma commits the segment before it; keep any remainder after the comma.
    if (v.includes(',')) {
      const parts = v.split(',');
      const last = parts.pop() ?? '';
      for (const seg of parts) {
        if (seg.trim()) void addByName(seg);
      }
      setText(last);
    } else {
      setText(v);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (openSug && suggestions[active]) void addByName(suggestions[active].name);
      else if (canCreate) void addByName(typed);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpenSug(true);
      setActive((a) => Math.min(a + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Escape') {
      setOpenSug(false);
    } else if (e.key === 'Backspace' && text === '' && skills.length > 0) {
      // Quick-remove the last chip when the field is empty.
      const last = skills[skills.length - 1];
      if (last) void remove(last.id);
    }
  }

  const showDropdown = openSug && (suggestions.length > 0 || canCreate);

  return (
    <div className="card">
      <div className="card-h">{title}</div>
      {skills.length === 0 ? (
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>Nenhuma ainda.</p>
      ) : (
        <div className="skill-edit">
          {skills.map((s) => (
            <span key={s.id} className={`skill-pill ${relation}`}>
              {s.name}
              {s.level ? <em className="skill-lvl">{LEVEL_LABEL[s.level] ?? s.level}</em> : null}
              <button onClick={() => remove(s.id)} aria-label={`Remover ${s.name}`}><CloseX /></button>
            </span>
          ))}
        </div>
      )}

      {relation === 'offered' ? (
        <div className="field" style={{ marginBottom: 'var(--sp-3)' }}>
          <label htmlFor={`lvl-${relation}`}>Nível (para a próxima habilidade)</label>
          <select
            id={`lvl-${relation}`}
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">Sem nível</option>
            {SKILL_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="skill-typeahead" ref={boxRef}>
        <input
          className="input"
          value={text}
          placeholder="Digite e use vírgula para adicionar…"
          aria-label={`Adicionar habilidade (${title})`}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          onFocusCapture={() => setOpenSug(true)}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {showDropdown ? (
          <div className="skill-suggest" role="listbox">
            {suggestions.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                onMouseEnter={() => setActive(i)}
                onClick={() => addByName(c.name)}
              >
                {c.name}<span className="hint">existente</span>
              </button>
            ))}
            {canCreate ? (
              <button type="button" className="new" onClick={() => addByName(typed)}>
                Criar “{typed}”<span className="hint">nova</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="skill-hint">Separe por vírgula. Clique no campo para ver sugestões.</p>
    </div>
  );
}
