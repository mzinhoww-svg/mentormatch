'use client';
import { api } from '../api.js';
import { Loading } from '../components.js';
import { useResource } from '../components.js';

interface Summary {
  unread: number;
  mentorships: number;
  pendingRequests: number;
}

export function HomeView() {
  const { data, loading } = useResource<Summary>(async () => {
    const [n, m, r] = await Promise.all([
      api.get<{ unread: number }>('/api/notifications'),
      api.get<{ mentorships: unknown[] }>('/api/mentorship/mentorships'),
      api.get<{ asMentor: { status: string }[] }>('/api/mentorship/requests'),
    ]);
    return {
      unread: n.unread,
      mentorships: m.mentorships.length,
      pendingRequests: r.asMentor.filter((x) => x.status === 'pending' || x.status === 'waitlisted').length,
    };
  });

  return (
    <div>
      <div className="eyebrow">Passe adiante.</div>
      <h1 className="page-title serif" style={{ fontSize: 38, marginTop: 6 }}>
        O conhecimento circula.
      </h1>
      {loading || !data ? (
        <Loading />
      ) : (
        <div className="grid grid-3" style={{ marginTop: 'var(--sp-5)' }}>
          <a className="card" href="/app/notifications" style={{ textDecoration: 'none' }}>
            <div className="stat-k">Não lidas</div>
            <div className="stat-v" style={{ marginTop: 6 }}>{data.unread}</div>
          </a>
          <a className="card" href="/app/mentorships" style={{ textDecoration: 'none' }}>
            <div className="stat-k">Mentorias ativas</div>
            <div className="stat-v" style={{ marginTop: 6 }}>{data.mentorships}</div>
          </a>
          <a className="card" href="/app/requests" style={{ textDecoration: 'none' }}>
            <div className="stat-k">Solicitações pendentes</div>
            <div className="stat-v" style={{ marginTop: 6 }}>{data.pendingRequests}</div>
          </a>
        </div>
      )}
    </div>
  );
}
