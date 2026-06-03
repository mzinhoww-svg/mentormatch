import type { Metadata } from 'next';
import { Mark } from '../../ui/Mark.js';
import { HR_BENEFITS, HOW_IT_WORKS } from '../../marketing/content.js';

export const metadata: Metadata = {
  title: 'Mentoria corporativa que faz o conhecimento circular',
  description:
    'Transforme a experiência da sua empresa num sistema que circula: conexões certas, no momento certo, com acompanhamento e resultado visível. Solicite uma demonstração.',
  openGraph: {
    title: 'MentorMatch — o conhecimento circula',
    description: 'Plataforma de mentoria corporativa. Solicite uma demonstração.',
    images: ['/og.png'],
  },
};

export default function HomePage() {
  return (
    <>
      <section className="mk-hero">
        <div className="mk-wrap" style={{ position: 'relative' }}>
          <div className="mk-hero-mark">
            <Mark
              size={420}
              ink="var(--tinta-900)"
              accent="var(--brand-primary)"
              className="mm-live"
            />
          </div>
          <div className="mk-eyebrow">SaaS de mentoria corporativa</div>
          <h1 className="mk-h1">
            O conhecimento não para.
            <br />
            <span className="mk-accent">Ele circula.</span>
          </h1>
          <p className="mk-lead">
            Para empresas que tratam pessoas como seu maior ativo, o MentorMatch conecta quem sabe
            a quem precisa saber — com método, em escala e medindo impacto. Diferente de plataformas
            de RH que só registram treinamentos, aqui o conhecimento <b>circula</b>.
          </p>
          <div className="mk-cta-row">
            <a className="btn btn-primary" href="/demo">Solicitar Demonstração</a>
            <a className="btn btn-ghost" href="/como-funciona">Como funciona</a>
          </div>
          <div className="mk-trust">
            <div><div className="k">Conceito</div><div className="v">A Corrente · Circulação</div></div>
            <div><div className="k">Para</div><div className="v">Pessoas & Cultura · L&D</div></div>
            <div><div className="k">Assinatura</div><div className="v">Passe adiante.</div></div>
          </div>
        </div>
      </section>

      <section className="mk-section alt">
        <div className="mk-wrap">
          <div className="mk-eyebrow">O problema</div>
          <h2 className="mk-h2">Conhecimento crítico mora na cabeça de poucos.</h2>
          <p className="mk-lead">
            Quando essas pessoas saem — ou só ficam ocupadas — o contexto evapora. Treinamento
            formal não transfere julgamento nem repertório. O oposto da corrente é o estoque.
          </p>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-eyebrow">Como funciona</div>
          <h2 className="mk-h2">Da conexão certa ao impacto medido.</h2>
          <div className="mk-grid mk-grid-3">
            {HOW_IT_WORKS.map((s, i) => (
              <div className="mk-card" key={s.key}>
                <div className="mk-step-n">{String(i + 1).padStart(2, '0')}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mk-cta-row">
            <a className="btn btn-ghost" href="/como-funciona">Ver em detalhe</a>
          </div>
        </div>
      </section>

      <section className="mk-section ink">
        <div className="mk-wrap">
          <div className="mk-eyebrow">Benefícios para RH</div>
          <h2 className="mk-h2">Ninguém cresce sozinho.</h2>
          <div className="mk-grid mk-grid-3">
            {HR_BENEFITS.slice(0, 3).map((b) => (
              <div className="mk-card" key={b.title}>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </div>
            ))}
          </div>
          <div className="mk-cta-row">
            <a className="btn btn-primary" href="/demo">Solicitar Demonstração</a>
            <a className="btn btn-ghost" href="/beneficios" style={{ color: 'var(--argila-100)' }}>
              Todos os benefícios
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
