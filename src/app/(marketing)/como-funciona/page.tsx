import type { Metadata } from 'next';
import { HOW_IT_WORKS } from '../../../marketing/content.js';

export const metadata: Metadata = {
  title: 'Como Funciona',
  description:
    'Mentores se disponibilizam, mentorados buscam, a conexão acontece por solicitação, as sessões são agendadas e o feedback fecha o ciclo. Veja como o MentorMatch faz o conhecimento circular.',
  openGraph: { title: 'Como Funciona · MentorMatch', description: 'Mentor, mentorado, busca, solicitação, sessão e feedback.', images: ['/og.png'] },
};

export default function ComoFuncionaPage() {
  return (
    <section className="mk-section">
      <div className="mk-wrap">
        <div className="mk-eyebrow">Como funciona</div>
        <h1 className="mk-h2" style={{ marginBottom: 16 }}>Conhecimento em movimento, em escala.</h1>
        <p className="mk-lead">
          Sem promessas vazias: abaixo está exatamente o que o produto faz hoje.
        </p>
        <div className="mk-grid mk-grid-2">
          {HOW_IT_WORKS.map((s, i) => (
            <div className="mk-card" key={s.key}>
              <div className="mk-step-n">PASSO {String(i + 1).padStart(2, '0')}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
        <div className="mk-cta-row">
          <a className="btn btn-primary" href="/demo">Solicitar Demonstração</a>
          <a className="btn btn-ghost" href="/planos">Ver planos</a>
        </div>
      </div>
    </section>
  );
}
