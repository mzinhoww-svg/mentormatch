'use client';
import { useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, ConfirmDialog, StarRating, StatusTag, PageHeader, useResource, errorMessage } from '../components.js';

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
  counterpartName: string | null;
  role: 'mentor' | 'mentee';
}

function mentorshipLabel(m: Mentorship | undefined): string {
  if (!m) return 'Mentoria';
  const name = m.counterpartName ?? 'sem nome';
  return m.role === 'mentor' ? `Mentorando ${name}` : `Com ${name}`;
}

export function SessionsView() {
  const sessions = useResource<{ sessions: Session[] }>(() => api.get('/api/mentorship/sessions'));
  const mentorships = useResource<{ mentorships: Mentorship[] }>(() =>
    api.get('/api/mentorship/mentorships'),
  );
  const [mentorshipId, setMentorshipId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [objective, setObjective] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const byId = new Map((mentorships.data?.mentorships ?? []).map((m) => [m.id, m]));
  const nowLocal = new Date().toISOString().slice(0, 16);

  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (new Date(scheduledAt).getTime() < Date.now()) {
      setMsg({ kind: 'error', text: 'Escolha uma data futura.' });
      return;
    }
    try {
      await api.post('/api/mentorship/sessions', {
        mentorshipId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        objective: objective || undefined,
      });
      setMsg({ kind: 'ok', text: 'Sessão criada.' });
      setObjective('');
      setScheduledAt('');
      sessions.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  async function act(path: string, sessionId: string) {
    await api.post(path, { sessionId }).catch(() => {});
    sessions.reload();
  }

  function doCancel() {
    if (confirmCancel) act('/api/mentorship/sessions/cancel', confirmCancel);
    setConfirmCancel(null);
  }

  const active = (mentorships.data?.mentorships ?? []).filter((m) => m.status === 'active');
  const all = sessions.data?.sessions ?? [];
  const upcoming = all.filter((s) => s.status === 'requested' || s.status === 'confirmed');
  const past = all.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  function renderRow(s: Session) {
    return (
      <div className="tl-item" key={s.id}>
        <span className={`tl-dot ${s.status}`} aria-hidden />
        <div className="tl-when">
          {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString('pt-BR') : 'Sem data'}
        </div>
        <div className="tl-title">
          {mentorshipLabel(byId.get(s.mentorshipId))}
          {s.objective ? ` · ${s.objective}` : ''}
        </div>
        <div className="tl-actions">
          <StatusTag status={s.status} />
          {s.status === 'requested' ? (
            <button className="btn btn-primary btn-sm" onClick={() => act('/api/mentorship/sessions/confirm', s.id)}>Confirmar</button>
          ) : null}
          {s.status === 'confirmed' ? (
            <button className="btn btn-primary btn-sm" onClick={() => act('/api/mentorship/sessions/complete', s.id)}>Concluir</button>
          ) : null}
          {s.status === 'requested' || s.status === 'confirmed' ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(s.id)}>Cancelar</button>
          ) : null}
          {s.status === 'completed' ? <RateSession sessionId={s.id} /> : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Sessões" subtitle="Seus encontros agendados e o histórico de conversas." />
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <form className="card" style={{ marginTop: 'var(--sp-4)' }} onSubmit={create}>
        <div className="card-h">Agendar sessão</div>
        <div className="field">
          <label htmlFor="ms">Mentoria</label>
          <select id="ms" className="select" value={mentorshipId} onChange={(e) => setMentorshipId(e.target.value)} required>
            <option value="">Selecione…</option>
            {active.map((m) => (
              <option key={m.id} value={m.id}>{mentorshipLabel(m)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="when">Data/hora</label>
          <input id="when" className="input" type="datetime-local" min={nowLocal} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="obj">Objetivo</label>
          <input id="obj" className="input" placeholder="Ex.: revisar metas do trimestre" value={objective} onChange={(e) => setObjective(e.target.value)} />
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
        ) : all.length === 0 ? (
          <EmptyState title="Nenhuma sessão ainda" hint="Agende a primeira sessão acima." />
        ) : (
          <>
            {upcoming.length > 0 ? (
              <>
                <div className="session-group">Próximas</div>
                <div className="timeline">{upcoming.map(renderRow)}</div>
              </>
            ) : null}
            {past.length > 0 ? (
              <>
                <div className="session-group">Histórico</div>
                <div className="timeline">{past.map(renderRow)}</div>
              </>
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel !== null}
        title="Cancelar sessão?"
        message="A sessão será marcada como cancelada. Esta ação não pode ser desfeita."
        confirmLabel="Cancelar sessão"
        cancelLabel="Voltar"
        onConfirm={doCancel}
        onCancel={() => setConfirmCancel(null)}
      />
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
  return <StarRating value={done} onRate={rate} label="Avaliar sessão" />;
}
