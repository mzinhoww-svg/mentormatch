import { Lockup } from '../ui/Mark.js';
import { MARKETING_ROUTES } from './seo.js';

/** Institutional top nav. Server component (no client state needed). */
export function MarketingNav() {
  return (
    <header className="mk-nav">
      <a href="/" className="mk-nav-brand" aria-label="MentorMatch — início">
        <Lockup height={22} ink="var(--ink)" />
      </a>
      <nav className="mk-nav-links" aria-label="Navegação">
        {MARKETING_ROUTES.filter((r) => r.href !== '/').map((r) => (
          <a key={r.href} href={r.href}>
            {r.label}
          </a>
        ))}
      </nav>
      <div className="mk-nav-cta">
        <a className="btn btn-ghost btn-sm" href="/login">
          Entrar
        </a>
        <a className="btn btn-primary btn-sm" href="/demo">
          Solicitar Demonstração
        </a>
      </div>
    </header>
  );
}
