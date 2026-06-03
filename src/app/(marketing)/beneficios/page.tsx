import type { Metadata } from 'next';
import { HR_BENEFITS } from '../../../marketing/content.js';

export const metadata: Metadata = {
  title: 'Benefícios para RH',
  description:
    'Retenção de conhecimento, sucessão, desenvolvimento interno, aceleração de onboarding e compartilhamento de expertise — o impacto da mentoria que circula para Pessoas & Cultura.',
  openGraph: { title: 'Benefícios para RH · MentorMatch', description: 'Retenção, sucessão, desenvolvimento, onboarding e expertise.', images: ['/og.png'] },
};

export default function BeneficiosPage() {
  return (
    <section className="mk-section">
      <div className="mk-wrap">
        <div className="mk-eyebrow">Benefícios para RH</div>
        <h1 className="mk-h2" style={{ marginBottom: 16 }}>O que circula, fica.</h1>
        <p className="mk-lead">
          Para líderes de Pessoas &amp; Cultura e L&amp;D que querem transformar experiência
          acumulada em vantagem para o negócio.
        </p>
        <div className="mk-grid mk-grid-2">
          {HR_BENEFITS.map((b) => (
            <div className="mk-card" key={b.title}>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
          ))}
        </div>
        <div className="mk-cta-row">
          <a className="btn btn-primary" href="/demo">Solicitar Demonstração</a>
        </div>
      </div>
    </section>
  );
}
