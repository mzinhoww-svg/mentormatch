'use client';
import { useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, useResource, errorMessage } from '../components.js';

interface Session {
  id: string;
  mentorshipId: string;
  scheduledAt: string | null;
  objective: string | null;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
}
interface Mentorship {
  id: string;
  status: string;
}

const STATUS_TAG: Record<string, string> = {
  requested: 'tag-ember',
  confirmed: 'tag-green',
  completed: 'tag-gray',
  cancelled: 'tag-gray',
};

export function SessionsView() {
  const sessions = useResource<{ sessions: Session[] }>(() => api.get('/api/mentorship/sessions'));
  const mentorships = useResource<{ mentorships: Mentorship[] }>(() =>
    api.get('/api/mentorship/mentorships'),
  );
  const [mentorshipId, setMentorshipId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [objective, setObjective] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/api/mentorship/sessions', {
        mentorshipId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        objective: objective || undefined,
      });
      setMsg({ kind: 'ok', text: 'Sessão criada.' });
      setObjective('');
      sessions.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  async function act(path: string, sessionId: string) {
    await api.post(path, { sessionId }).catch(() => {});
    sessions.reload();
  }

  const active = mentorships.data?.mentorships.filter((m) => m.status === 'active') ?? [];

  return (
    <div>
      <h1 className="page-title">Sessões</h1>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <form className="card" style={{ marginTop: 'var(--sp-4)' }} onSubmit={create}>
        <div className="card-h">Agendar sessão</div>
        <div className="field">
          <label htmlFor="ms">Mentoria</label>
          <select id="ms" className="select" value={mentorshipId} onChange={(e) => setMentorshipId(e.target.value)} required>
            <option value="">Selecione…</option>
            {active.map((m) => (
              <option key={m.id} value={m.id}>{m.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="when">Data/hora</label>
          <input id="when" className="input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="obj">Objetivo</label>
          <input id="obj" className="input" value={objective} onChange={(e) => setObjective(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={!mentorshipId || !scheduledAt}>
          Criar sessão
        </button>
      </form>

      <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="card-h">Minhas sessões</div>
        {sessions.loading ? (
          <Loading />
        ) : sessions.error || !sessions.data ? (
          <Banner kind="error">{sessions.error ?? 'erro'}</Banner>
        ) : sessions.data.sessions.length === 0 ? (
          <EmptyState title="Nenhuma sessão ainda" />
        ) : (
          sessions.data.sessions.map((s) => (
            <div className="row-item" key={s.id} style={{ flexWrap: 'wrap' }}>
              <span className={`tag ${STATUS_TAG[s.status]}`}>{s.status}</span>
              <span style={{ flex: 1, fontSize: 14 }}>
                {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString('pt-BR') : 'sem data'}
                {s.objective ? ` · ${s.objective}` : ''}
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                {s.status === 'requested' ? (
                  <button className="btn btn-primary btn-sm" onClick={() => act('/api/mentorship/sessions/confirm', s.id)}>
                    Confirmar
                  </button>
                ) : null}
                {s.status === 'confirmed' ? (
                  <button className="btn btn-primary btn-sm" onClick={() => act('/api/mentorship/sessions/complete', s.id)}>
                    Concluir
                  </button>
                ) : null}
                {s.status === 'requested' || s.status === 'confirmed' ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => act('/api/mentorship/sessions/cancel', s.id)}>
                    Cancelar
                  </button>
                ) : null}
                {s.status === 'completed' ? <RateSession sessionId={s.id} /> : null}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Minimal 1–5 post-session rating that posts session feedback (Slice 12). */
function RateSession({ sessionId }: { sessionId: string }) {
  const [done, setDone] = useState<number | null>(null);
  async function rate(score: number) {
    try {
      await api.post('/api/feedback/session', { sessionId, score });
      setDone(score);
    } catch {
      setDone(null);
    }
  }
  if (done !== null) {
    return (
      <span className="tag tag-green" data-testid="rated">
        Avaliado: {done}/5
      </span>
    );
  }
  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }} aria-label="Avaliar sessão">
      <span className="muted" style={{ fontSize: 12 }}>Avaliar:</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} className="btn btn-ghost btn-sm" onClick={() => rate(n)} aria-label={`Nota ${n}`}>
          {n}
        </button>
      ))}
    </span>
  );
}
