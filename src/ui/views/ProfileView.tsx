'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, useResource, errorMessage } from '../components.js';

interface Skill {
  id: string;
  skillId: string;
  name: string;
  relation: 'offered' | 'sought' | 'interest';
  level: string | null;
}
interface ProfilePayload {
  profile: {
    bio: string | null;
    title: string | null;
    area: string | null;
    seniority: string | null;
    status: 'active' | 'inactive';
    mentorAvailable: boolean;
    mentorPaused: boolean;
  };
  skills: { offered: Skill[]; sought: Skill[]; interest: Skill[] };
  goals: { id: string; description: string }[];
  roles: { isMentor: boolean; isMentee: boolean };
}

export function ProfileView() {
  const { data, error, loading, reload } = useResource<ProfilePayload>(() =>
    api.get('/api/profile'),
  );
  const [form, setForm] = useState({ bio: '', title: '', area: '', seniority: '' });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setForm({
        bio: data.profile.bio ?? '',
        title: data.profile.title ?? '',
        area: data.profile.area ?? '',
        seniority: data.profile.seniority ?? '',
      });
    }
  }, [data]);

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  async function save(e: FormEvent) {
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

  async function setAvailability(patch: { available?: boolean; paused?: boolean }) {
    await api.post('/api/profile/availability', patch).catch(() => {});
    reload();
  }

  const p = data.profile;
  return (
    <div>
      <h1 className="page-title">Perfil</h1>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="grid grid-2" style={{ marginTop: 'var(--sp-5)' }}>
        <form className="card" onSubmit={save}>
          <div className="card-h">Dados</div>
          {(['title', 'area', 'seniority'] as const).map((k) => (
            <div className="field" key={k}>
              <label htmlFor={k}>{k === 'title' ? 'Cargo' : k === 'area' ? 'Área' : 'Senioridade'}</label>
              <input
                id={k}
                className="input"
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              />
            </div>
          ))}
          <div className="field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="textarea"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </form>

        <div className="card">
          <div className="card-h">Disponibilidade como mentor</div>
          <p className="muted" style={{ fontSize: 14 }}>
            Status do perfil: <b>{p.status === 'active' ? 'ativo' : 'inativo'}</b>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'var(--sp-3)' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={p.mentorAvailable}
                onChange={(e) => setAvailability({ available: e.target.checked })}
              />
              Disponível para mentorar
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={p.mentorPaused}
                onChange={(e) => setAvailability({ paused: e.target.checked })}
              />
              Pausar disponibilidade
            </label>
          </div>
          {p.status !== 'active' ? (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 'var(--sp-4)' }}
              onClick={async () => {
                await api.post('/api/profile/activate').catch(() => {});
                reload();
              }}
            >
              Ativar perfil
            </button>
          ) : null}

          <div className="card-h" style={{ marginTop: 'var(--sp-5)' }}>Skills oferecidas</div>
          <SkillList skills={data.skills.offered} empty="Nenhuma skill oferecida." />
          <div className="card-h" style={{ marginTop: 'var(--sp-4)' }}>Skills buscadas</div>
          <SkillList skills={data.skills.sought} empty="Nenhuma skill buscada." />

          <div className="card-h" style={{ marginTop: 'var(--sp-5)' }}>Objetivos</div>
          {data.goals.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>Nenhum objetivo definido.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {data.goals.map((g) => (
                <li key={g.id}>{g.description}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillList({ skills, empty }: { skills: Skill[]; empty: string }) {
  if (skills.length === 0) return <p className="muted" style={{ fontSize: 14 }}>{empty}</p>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {skills.map((s) => (
        <span key={s.id} className="tag tag-gray">
          {s.name}
        </span>
      ))}
    </div>
  );
}
