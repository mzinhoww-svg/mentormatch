'use client';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, useResource } from '../components.js';

interface Req {
  id: string;
  menteeId: string;
  mentorId: string;
  skillId: string | null;
  status: string;
  createdAt: string;
}
interface Payload {
  asMentor: Req[];
  asMentee: Req[];
}

const STATUS_TAG: Record<string, string> = {
  pending: 'tag-ember',
  waitlisted: 'tag-gray',
  accepted: 'tag-green',
  rejected: 'tag-gray',
  cancelled: 'tag-gray',
  expired: 'tag-gray',
};

export function RequestsView() {
  const { data, error, loading, reload } = useResource<Payload>(() =>
    api.get('/api/mentorship/requests'),
  );

  async function act(path: string, requestId: string) {
    await api.post(path, { requestId }).catch(() => {});
    reload();
  }

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  const open = (r: Req) => r.status === 'pending' || r.status === 'waitlisted';

  return (
    <div>
      <h1 className="page-title">Solicitações</h1>

      <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="card-h">Recebidas (como mentor)</div>
        {data.asMentor.length === 0 ? (
          <EmptyState title="Nenhuma solicitação recebida" />
        ) : (
          data.asMentor.map((r) => (
            <div className="row-item" key={r.id}>
              <span className={`tag ${STATUS_TAG[r.status] ?? 'tag-gray'}`}>{r.status}</span>
              <span style={{ flex: 1, fontSize: 14 }}>Mentorado {r.menteeId.slice(0, 8)}</span>
              {open(r) ? (
                <span style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => act('/api/mentorship/requests/accept', r.id)}>
                    Aceitar
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => act('/api/mentorship/requests/reject', r.id)}>
                    Recusar
                  </button>
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="card-h">Enviadas (como mentorado)</div>
        {data.asMentee.length === 0 ? (
          <EmptyState title="Nenhuma solicitação enviada" />
        ) : (
          data.asMentee.map((r) => (
            <div className="row-item" key={r.id}>
              <span className={`tag ${STATUS_TAG[r.status] ?? 'tag-gray'}`}>{r.status}</span>
              <span style={{ flex: 1, fontSize: 14 }}>Mentor {r.mentorId.slice(0, 8)}</span>
              {open(r) ? (
                <button className="btn btn-ghost btn-sm" onClick={() => act('/api/mentorship/requests/cancel', r.id)}>
                  Cancelar
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
