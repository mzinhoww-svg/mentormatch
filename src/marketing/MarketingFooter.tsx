import { Lockup } from '../ui/Mark.js';
import { MARKETING_ROUTES } from './seo.js';

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mk-footer">
      <div className="mk-footer-grid">
        <div>
          <Lockup height={22} ink="var(--argila-50)" />
          <p className="mk-footer-tag serif">Passe adiante.</p>
        </div>
        <nav aria-label="Rodapé">
          {MARKETING_ROUTES.map((r) => (
            <a key={r.href} href={r.href}>
              {r.label}
            </a>
          ))}
          <a href="/demo">Solicitar Demonstração</a>
          <a href="/login">Entrar</a>
        </nav>
      </div>
      <div className="mk-footer-base mono">MENTORMATCH · © {year} · O conhecimento circula.</div>
    </footer>
  );
}
