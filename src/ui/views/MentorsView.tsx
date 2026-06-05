'use client';
import { useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { SkeletonGrid, EmptyState, Banner, useResource, errorMessage, initials } from '../components.js';

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

const Chevron = () => (
  <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export function MentorsView() {
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [skill, setSkill] = useState('');
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [requested, setRequested] = useState<Record<string, 'sending' | 'done' | 'error'>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, loading } = useResource<SearchResult>(
    () => api.get(`/api/mentors${query}`),
    [query],
  );

  function buildQuery(nextSkill = skill) {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (area.trim()) params.set('area', area.trim());
    if (nextSkill.trim()) params.set('skill', nextSkill.trim());
    const qs = params.toString();
    setQuery(qs ? `?${qs}` : '');
  }
  function applyFilters(e: FormEvent) {
    e.preventDefault();
    buildQuery();
  }

  const skillsInView = Array.from(
    new Set((data?.items ?? []).flatMap((m) => m.offeredSkills)),
  ).slice(0, 10);

  function toggleSkill(s: string) {
    const next = skill === s ? '' : s;
    setSkill(next);
    buildQuery(next);
  }

  async function requestMentorship(mentorId: string) {
    setMsg(null);
    setRequested((r) => ({ ...r, [mentorId]: 'sending' }));
    try {
      await api.post('/api/mentorship/requests', { mentorId });
      setRequested((r) => ({ ...r, [mentorId]: 'done' }));
    } catch (err) {
      setRequested((r) => ({ ...r, [mentorId]: 'error' }));
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Descubra</span>
        <h1 className="page-title">Mentores</h1>
        <p className="page-sub">Conecte-se com quem já trilhou o caminho que você quer percorrer.</p>
      </div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <form onSubmit={applyFilters} className="card" style={{ marginTop: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label htmlFor="q">Buscar</label>
            <div className="input-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input id="q" className="input" placeholder="nome, cargo, bio…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ margin: 0, minWidth: 160 }}>
            <label htmlFor="area">Área</label>
            <input id="area" className="input" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">Filtrar</button>
        </div>
        {skillsInView.length > 0 ? (
          <div className="skill-filter" aria-label="Filtrar por habilidade">
            {skillsInView.map((s) => (
              <button key={s} type="button" className={skill === s ? 'on' : ''} onClick={() => toggleSkill(s)} aria-pressed={skill === s}>
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </form>

      <div style={{ marginTop: 'var(--sp-5)' }}>
        {loading ? (
          <SkeletonGrid count={6} />
        ) : error ? (
          <Banner kind="error">{error}</Banner>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="Nenhum mentor encontrado" hint="Ajuste os filtros e tente de novo." />
        ) : (
          <div className="grid grid-3" data-testid="mentor-cards">
            {data.items.map((m) => {
              const st = requested[m.tenantUserId];
              const open = expanded === m.tenantUserId;
              const detailId = `m-detail-${m.tenantUserId}`;
              return (
                <div
                  key={m.tenantUserId}
                  className="card mentor-card"
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  aria-controls={detailId}
                  onClick={() => setExpanded(open ? null : m.tenantUserId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpanded(open ? null : m.tenantUserId);
                    }
                  }}
                >
                  <div className="mentor-card-head">
                    <span className="av-wrap">
                      <span className="av">{initials(m.displayName)}</span>
                      <span className={`av-dot ${m.available ? 'on' : 'off'}`} aria-hidden />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{m.displayName ?? 'Mentor'}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {[m.title, m.area].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <Chevron />
                  </div>

                  <div className={`mentor-status ${m.available ? 'on' : 'off'}`} style={{ marginTop: 8 }}>
                    {m.available ? 'Disponível' : 'Sem vaga no momento'}
                  </div>

                  {m.offeredSkills.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'var(--sp-3)' }}>
                      {m.offeredSkills.slice(0, 4).map((s) => (
                        <span key={s} className="tag tag-skill">{s}</span>
                      ))}
                      {m.offeredSkills.length > 4 ? (
                        <span className="tag tag-gray">+{m.offeredSkills.length - 4}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Expandable detail */}
                  <div className="mentor-detail" id={detailId} role="region" aria-label={`Detalhes de ${m.displayName ?? 'mentor'}`}>
                    <div className="mentor-detail-inner">
                      {m.bio ? (
                        <div className="detail-row">
                          <div className="detail-k">Sobre</div>
                          <p className="detail-bio" style={{ margin: 0 }}>{m.bio}</p>
                        </div>
                      ) : null}
                      {m.seniority ? (
                        <div className="detail-row">
                          <div className="detail-k">Senioridade</div>
                          <div className="detail-v">{m.seniority}</div>
                        </div>
                      ) : null}
                      {m.offeredSkills.length > 0 ? (
                        <div className="detail-row">
                          <div className="detail-k">Todas as habilidades oferecidas</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {m.offeredSkills.map((s) => (
                              <span key={s} className="tag tag-skill">{s}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="contact-locked" style={{ marginTop: 'var(--sp-3)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        Contato liberado após a mentoria ser aceita.
                      </div>
                    </div>
                  </div>

                  <button
                    className={`btn btn-sm ${st === 'done' ? 'btn-ghost' : 'btn-primary'}`}
                    data-testid={`request-${m.tenantUserId}`}
                    style={{ marginTop: 'var(--sp-4)' }}
                    disabled={!m.available || st === 'sending' || st === 'done'}
                    onClick={(e) => { e.stopPropagation(); requestMentorship(m.tenantUserId); }}
                  >
                    {st === 'sending' ? 'Enviando…' : st === 'done' ? 'Solicitado ✓' : !m.available ? 'Indisponível' : 'Solicitar mentoria'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
