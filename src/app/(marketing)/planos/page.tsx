import type { Metadata } from 'next';
import { PLANS } from '../../../marketing/content.js';

export const metadata: Metadata = {
  title: 'Planos',
  description:
    'Starter, Growth e Enterprise — estrutura comercial do MentorMatch com recursos compatíveis com o produto. Solicite uma demonstração para um plano sob medida.',
  openGraph: { title: 'Planos · MentorMatch', description: 'Starter, Growth e Enterprise.' },
};

export default function PlanosPage() {
  return (
    <section className="mk-section">
      <div className="mk-wrap">
        <div className="mk-eyebrow">Planos</div>
        <h1 className="mk-h2" style={{ marginBottom: 16 }}>Escolha o ritmo da sua corrente.</h1>
        <p className="mk-lead">
          Estrutura comercial transparente. Valores sob consulta — falamos com você na
          demonstração.
        </p>
        <div className="mk-plans">
          {PLANS.map((p) => (
            <div className={`mk-plan${p.highlight ? ' hi' : ''}`} key={p.key}>
              {p.highlight ? <span className="badge">Mais escolhido</span> : null}
              <h3>{p.name}</h3>
              <div className="price">{p.tagline}</div>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a className={`btn ${p.highlight ? 'btn-primary' : 'btn-ghost'}`} href="/demo">
                Solicitar Demonstração
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
