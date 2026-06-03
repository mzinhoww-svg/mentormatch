import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contato',
  description: 'Fale com a equipe do MentorMatch. Tire dúvidas ou solicite uma demonstração.',
  openGraph: { title: 'Contato · MentorMatch', description: 'Fale com a equipe do MentorMatch.', images: ['/og.png'] },
};

export default function ContatoPage() {
  return (
    <section className="mk-section">
      <div className="mk-wrap">
        <div className="mk-eyebrow">Contato</div>
        <h1 className="mk-h2" style={{ marginBottom: 16 }}>Vamos conversar.</h1>
        <p className="mk-lead">
          Quer entender se o MentorMatch faz sentido para a sua empresa? A forma mais rápida é
          solicitar uma demonstração — respondemos com um horário.
        </p>
        <div className="mk-grid mk-grid-2">
          <div className="mk-card">
            <h3>Comercial &amp; demonstrações</h3>
            <p>
              <a href="mailto:contato@mentormatch.app">contato@mentormatch.app</a>
            </p>
          </div>
          <div className="mk-card">
            <h3>Já é cliente?</h3>
            <p>
              Acesse o produto pelo endereço da sua empresa ou pela página de{' '}
              <a href="/login">login</a>.
            </p>
          </div>
        </div>
        <div className="mk-cta-row">
          <a className="btn btn-primary" href="/demo">Solicitar Demonstração</a>
        </div>
      </div>
    </section>
  );
}
