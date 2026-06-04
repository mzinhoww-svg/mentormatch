import type { Metadata } from 'next';
import { Mark } from '../../ui/Mark.js';
import { HR_BENEFITS, HOW_IT_WORKS, METHOD_PROOF } from '../../marketing/content.js';
import { HeroMockup } from '../../marketing/HeroMockup.js';
import { Reveal } from '../../marketing/Reveal.js';
import { FunnelTracker } from '../../marketing/FunnelTracker.js';
import { TrackedCta } from '../../marketing/TrackedCta.js';

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
      <FunnelTracker event="landing_view" />
      <section className="mk-hero">
        <div className="mk-wrap">
          <div className="mk-hero-grid">
            <div className="mk-hero-copy">
              <div className="mk-eyebrow">SaaS de mentoria corporativa</div>
              <h1 className="mk-h1">
                O conhecimento não para.
                <br />
                <span className="mk-accent">Ele circula.</span>
              </h1>
              <p className="mk-lead">
                Para empresas que tratam pessoas como seu maior ativo, o MentorMatch conecta quem
                sabe a quem precisa saber — com método, em escala e medindo impacto. Diferente de
                plataformas de RH que só registram treinamentos, aqui o conhecimento <b>circula</b>.
              </p>
              <div className="mk-cta-row">
                <TrackedCta event="landing_cta_demo" className="btn btn-primary" href="/demo">Solicitar Demonstração</TrackedCta>
                <a className="btn btn-ghost" href="/como-funciona">Como funciona</a>
              </div>
            </div>
            <div className="mk-hero-visual">
              <div className="mk-hero-mark" aria-hidden="true">
                <Mark size={300} ink="var(--tinta-900)" accent="var(--brand-primary)" className="mm-live" decorative />
              </div>
              <HeroMockup />
            </div>
          </div>

          <div className="mk-proof" role="list" aria-label="Como o método funciona">
            {METHOD_PROOF.map((p) => (
              <div className="mk-proof-item" role="listitem" key={p.k}>
                <div className="mk-proof-k">{p.k}</div>
                <div className="mk-proof-v">{p.v}</div>
                <p className="mk-proof-note">{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section alt">
        <div className="mk-wrap">
          <Reveal>
            <div className="mk-eyebrow">O problema</div>
            <h2 className="mk-h2">Conhecimento crítico mora na cabeça de poucos.</h2>
            <p className="mk-lead">
              Quando essas pessoas saem — ou só ficam ocupadas — o contexto evapora. Treinamento
              formal não transfere julgamento nem repertório. O oposto da corrente é o estoque.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-eyebrow">Como funciona</div>
          <h2 className="mk-h2">Da conexão certa ao impacto medido.</h2>
          <div className="mk-grid mk-grid-3">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal key={s.key} delay={(i % 3) * 90}>
                <div className="mk-card">
                  <div className="mk-step-n">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </Reveal>
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
            {HR_BENEFITS.slice(0, 3).map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 90}>
                <div className="mk-card">
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mk-cta-row">
            <TrackedCta event="landing_cta_demo" className="btn btn-primary" href="/demo">Solicitar Demonstração</TrackedCta>
            <a className="btn btn-ghost" href="/beneficios" style={{ color: 'var(--argila-100)' }}>
              Todos os benefícios
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
