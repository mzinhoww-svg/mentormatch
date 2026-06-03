'use client';
import { api } from '../api.js';
import { Loading, useResource } from '../components.js';
import { Mark } from '../Mark.js';

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
      <section className="home-hero">
        <div className="home-hero-mark">
          <Mark size={300} ink="var(--argila-100)" accent="var(--brasa-400)" className="mm-live" />
        </div>
        <div style={{ position: 'relative' }}>
          <div className="eyebrow">Passe adiante.</div>
          <h1>
            O conhecimento <span className="accent">circula.</span>
          </h1>
          <p>Conecte quem sabe a quem precisa saber — com método, em escala e impacto medido.</p>
        </div>
      </section>

      {loading || !data ? (
        <Loading />
      ) : (
        <div className="grid grid-3">
          <a className="card" href="/app/notifications" style={{ textDecoration: 'none' }}>
            <div className="stat-k">Não lidas</div>
            <div className="stat-v" style={{ marginTop: 10 }}>{data.unread}</div>
          </a>
          <a className="card" href="/app/mentorships" style={{ textDecoration: 'none' }}>
            <div className="stat-k">Mentorias ativas</div>
            <div className="stat-v" style={{ marginTop: 10 }}>{data.mentorships}</div>
          </a>
          <a className="card" href="/app/requests" style={{ textDecoration: 'none' }}>
            <div className="stat-k">Solicitações pendentes</div>
            <div className="stat-v" style={{ marginTop: 10 }}>{data.pendingRequests}</div>
          </a>
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: 'var(--sp-6)' }}>
        <a className="card" href="/app/mentors" style={{ textDecoration: 'none' }}>
          <div className="card-h">Comece por aqui</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1.1 }}>Encontre um mentor</div>
          <p className="muted" style={{ fontSize: 14, margin: '8px 0 0' }}>
            Busque no diretório por área e habilidade e solicite uma mentoria.
          </p>
        </a>
        <a className="card" href="/app/profile" style={{ textDecoration: 'none' }}>
          <div className="card-h">Seu perfil</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1.1 }}>Ofereça conhecimento</div>
          <p className="muted" style={{ fontSize: 14, margin: '8px 0 0' }}>
            Ative seu perfil, liste suas skills e disponibilize-se para mentorar.
          </p>
        </a>
      </div>
    </div>
  );
}
