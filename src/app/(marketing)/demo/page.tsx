import type { Metadata } from 'next';
import { DemoForm } from '../../../marketing/DemoForm.js';
import { FunnelTracker } from '../../../marketing/FunnelTracker.js';

export const metadata: Metadata = {
  title: 'Solicitar Demonstração',
  description:
    'Veja o MentorMatch em ação na sua empresa. Conte um pouco sobre seu time e agendamos uma demonstração.',
  openGraph: { title: 'Solicitar Demonstração · MentorMatch', description: 'Agende uma demonstração do MentorMatch.', images: ['/og.png'] },
};

export default function DemoPage() {
  return (
    <section className="mk-section">
      <FunnelTracker event="demo_view" />
      <div className="mk-wrap">
        <div className="mk-two">
          <div>
            <div className="mk-eyebrow">Demonstração</div>
            <h1 className="mk-h2" style={{ marginBottom: 16 }}>Veja o conhecimento circular.</h1>
            <p className="mk-lead">
              Conte sobre seu time e mostramos como o MentorMatch conecta mentores e mentorados,
              organiza sessões e mede impacto — com a marca da sua empresa.
            </p>
          </div>
          <DemoForm />
        </div>
      </div>
    </section>
  );
}
