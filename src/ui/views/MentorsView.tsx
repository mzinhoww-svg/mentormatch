'use client';
import { useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, useResource, errorMessage, initials } from '../components.js';

interface MentorItem {
  tenantUserId: string;
  displayName: string | null;
  title: string | null;
  area: string | null;
  seniority: string | null;
  bio: string | null;
  offeredSkills: string[];
  available: boolean;
}
interface SearchResult {
  items: MentorItem[];
  total: number;
}

export function MentorsView() {
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const { data, error, loading } = useResource<SearchResult>(
    () => api.get(`/api/mentors${query}`),
    [query],
  );

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (area.trim()) params.set('area', area.trim());
    const qs = params.toString();
    setQuery(qs ? `?${qs}` : '');
  }

  async function requestMentorship(mentorId: string) {
    setMsg(null);
    try {
      await api.post('/api/mentorship/requests', { mentorId });
      setMsg({ kind: 'ok', text: 'Solicitação enviada.' });
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  return (
    <div>
      <h1 className="page-title">Mentores</h1>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <form onSubmit={applyFilters} className="card" style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
          <label htmlFor="q">Buscar</label>
          <input id="q" className="input" placeholder="nome, cargo, bio…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0, minWidth: 160 }}>
          <label htmlFor="area">Área</label>
          <input id="area" className="input" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">Filtrar</button>
      </form>

      <div style={{ marginTop: 'var(--sp-5)' }}>
        {loading ? (
          <Loading />
        ) : error ? (
          <Banner kind="error">{error}</Banner>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="Nenhum mentor encontrado" hint="Ajuste os filtros e tente de novo." />
        ) : (
          <div className="grid grid-3" data-testid="mentor-cards">
            {data.items.map((m) => (
              <div key={m.tenantUserId} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="av">{initials(m.displayName)}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.displayName ?? 'Mentor'}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {[m.title, m.area].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                </div>
                {m.offeredSkills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'var(--sp-3)' }}>
                    {m.offeredSkills.slice(0, 4).map((s) => (
                      <span key={s} className="tag tag-green">{s}</span>
                    ))}
                  </div>
                ) : null}
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 'var(--sp-4)' }}
                  onClick={() => requestMentorship(m.tenantUserId)}
                >
                  Solicitar mentoria
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
