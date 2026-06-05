'use client';
import { api } from '../api.js';
import { SkeletonGrid, useResource, initials } from '../components.js';
import { Mark } from '../Mark.js';
import { profileCompleteness } from '../../profile/completeness.js';

interface ProfilePayload {
  profile: {
    avatarUrl: string | null;
    title: string | null;
    bio: string | null;
    linkedinUrl: string | null;
    languages: string[];
    mentorAvailable: boolean;
  } | null;
  contact: { contactWhatsapp: string | null };
  skills: { offered: unknown[]; sought: unknown[] };
  roles: { isMentor: boolean; isMentee: boolean };
}
interface MentorRec {
  tenantUserId: string;
  displayName: string | null;
  title: string | null;
  avatarUrl: string | null;
  offeredSkills: string[];
}

function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

interface ActionState {
  pendingRequests: number;
  activeMentorships: number;
  isMentee: boolean;
  isMentor: boolean;
  completenessPercent: number;
}
function nextAction(s: ActionState): { title: string; desc: string; href: string; cta: string } {
  if (s.pendingRequests > 0)
    return {
      title: `${s.pendingRequests} ${s.pendingRequests === 1 ? 'solicitação aguarda' : 'solicitações aguardam'} você`,
      desc: 'Aceite ou recuse para manter as conexões fluindo.',
      href: '/app/requests',
      cta: 'Responder',
    };
  if (s.activeMentorships > 0)
    return {
      title: 'Agende sua próxima sessão',
      desc: 'Mantenha o ritmo das suas mentorias ativas.',
      href: '/app/sessions',
      cta: 'Ir para sessões',
    };
  if (s.isMentee)
    return {
      title: 'Encontre o mentor certo para você',
      desc: 'Busque por área e habilidade e solicite uma mentoria.',
      href: '/app/mentors',
      cta: 'Explorar mentores',
    };
  if (s.completenessPercent < 100)
    return {
      title: 'Complete seu perfil',
      desc: 'Perfis completos recebem mais conexões e melhores recomendações.',
      href: '/app/profile',
      cta: 'Completar perfil',
    };
  if (s.isMentor)
    return {
      title: 'Você está disponível para mentorar',
      desc: 'Conheça a comunidade e veja com quem você pode contribuir.',
      href: '/app/mentors',
      cta: 'Explorar a comunidade',
    };
  return {
    title: 'Explore a comunidade',
    desc: 'Conecte-se e comece a circular conhecimento.',
    href: '/app/mentors',
    cta: 'Explorar mentores',
  };
}

export function HomeView({ displayName }: { displayName: string }) {
  const firstName = displayName.split(/\s+/)[0] || displayName;

  const { data, loading } = useResource(async () => {
    const [prof, mentors, notif, ms, reqs] = await Promise.all([
      api.get<ProfilePayload>('/api/profile'),
      api.get<{ items: MentorRec[] }>('/api/mentors?limit=3'),
      api.get<{ unread: number }>('/api/notifications'),
      api.get<{ mentorships: { status: string }[] }>('/api/mentorship/mentorships'),
      api.get<{ asMentor: { status: string }[] }>('/api/mentorship/requests'),
    ]);
    return {
      prof,
      mentors: mentors.items ?? [],
      unread: notif.unread ?? 0,
      activeMentorships: ms.mentorships.filter((m) => m.status === 'active').length,
      pendingRequests: reqs.asMentor.filter((r) => r.status === 'pending' || r.status === 'waitlisted').length,
    };
  });

  return (
    <div>
      <section className="home-hero">
        <div className="home-hero-mark">
          <Mark size={300} ink="var(--argila-100)" accent="var(--brasa-400)" className="mm-live" decorative />
        </div>
        <div style={{ position: 'relative' }}>
          <div className="eyebrow">{greeting()}, {firstName}</div>
          <h1>
            Pronto para <span className="accent">circular</span> conhecimento?
          </h1>
          <p>Seu espaço para aprender, ensinar e crescer — um passo de cada vez.</p>
        </div>
      </section>

      {loading || !data ? (
        <SkeletonGrid count={3} />
      ) : (
        <Dashboard data={data} />
      )}
    </div>
  );
}

function Dashboard({
  data,
}: {
  data: {
    prof: ProfilePayload;
    mentors: MentorRec[];
    unread: number;
    activeMentorships: number;
    pendingRequests: number;
  };
}) {
  const p = data.prof.profile;
  const completeness = profileCompleteness({
    avatarUrl: p?.avatarUrl ?? null,
    title: p?.title ?? null,
    bio: p?.bio ?? null,
    linkedinUrl: p?.linkedinUrl ?? null,
    languages: p?.languages ?? [],
    contactWhatsapp: data.prof.contact.contactWhatsapp,
    skillCount: data.prof.skills.offered.length + data.prof.skills.sought.length,
    hasIntention: (p?.mentorAvailable ?? false) || data.prof.skills.sought.length > 0,
  });
  const action = nextAction({
    pendingRequests: data.pendingRequests,
    activeMentorships: data.activeMentorships,
    isMentee: data.prof.roles.isMentee,
    isMentor: data.prof.roles.isMentor,
    completenessPercent: completeness.percent,
  });

  return (
    <>
      <a className="dash-next" href={action.href}>
        <div className="dash-next-body">
          <span className="eyebrow">Próximo passo</span>
          <div className="dash-next-title">{action.title}</div>
          <p>{action.desc}</p>
        </div>
        <span className="btn btn-primary">{action.cta}</span>
      </a>

      {completeness.percent < 100 ? (
        <a className="card dash-complete" href="/app/profile">
          <div className="dash-complete-top">
            <b>Perfil {completeness.percent}% completo</b>
            <span className="stat-go">completar →</span>
          </div>
          <div className="dash-complete-bar"><span style={{ width: `${completeness.percent}%` }} /></div>
        </a>
      ) : null}

      <div className="grid grid-3" style={{ marginTop: 'var(--sp-5)' }}>
        <a className="card dash-stat" href="/app/notifications">
          <div className="stat-k">Não lidas</div>
          <div className="stat-v">{data.unread}</div>
          <span className="stat-go">ver todas →</span>
        </a>
        <a className="card dash-stat" href="/app/mentorships">
          <div className="stat-k">Mentorias ativas</div>
          <div className="stat-v">{data.activeMentorships}</div>
          <span className="stat-go">ver todas →</span>
        </a>
        <a className="card dash-stat" href="/app/requests">
          <div className="stat-k">Solicitações pendentes</div>
          <div className="stat-v">{data.pendingRequests}</div>
          <span className="stat-go">ver todas →</span>
        </a>
      </div>

      {data.mentors.length > 0 ? (
        <section style={{ marginTop: 'var(--sp-6)' }}>
          <div className="dash-sec-head">
            <h2>Mentores para você</h2>
            <a href="/app/mentors" className="stat-go">ver todos →</a>
          </div>
          <div className="grid grid-3">
            {data.mentors.map((m) => (
              <a className="card rec-card" key={m.tenantUserId} href="/app/mentors">
                <span className="av">
                  {m.avatarUrl ? <img src={m.avatarUrl} alt={m.displayName ?? 'Mentor'} /> : initials(m.displayName)}
                </span>
                <div className="rec-body">
                  <div className="rec-name">{m.displayName ?? 'Mentor'}</div>
                  {m.title ? <div className="rec-title">{m.title}</div> : null}
                </div>
                {m.offeredSkills.length > 0 ? (
                  <div className="rec-skills">
                    {m.offeredSkills.slice(0, 2).map((s) => (
                      <span key={s} className="tag tag-skill">{s}</span>
                    ))}
                  </div>
                ) : null}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
