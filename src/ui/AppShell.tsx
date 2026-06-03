'use client';
/**
 * Authenticated app shell: branded sidebar nav (filtered by role), header, and
 * content area. Tenant branding is applied via CSS vars on the shell root.
 */
import { usePathname } from 'next/navigation';
import { Lockup } from './Mark.js';
import { api } from './api.js';
import { navForRole, activeHref } from './nav.js';
import { brandingStyle, type Branding } from './branding.js';
import { initials } from './components.js';

export function AppShell({
  role,
  displayName,
  branding,
  children,
}: {
  role: string;
  displayName: string;
  branding: Branding;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/app';
  const items = navForRole(role);
  const active = activeHref(pathname);

  async function logout() {
    await api.post('/api/auth/logout').catch(() => {});
    window.location.assign('/login');
  }

  return (
    <div className="app-shell" style={brandingStyle(branding)}>
      <aside className="side">
        <div className="side-brand">
          <Lockup height={22} ink="var(--argila-50)" />
        </div>
        <nav className="side-nav" aria-label="Navegação principal">
          {items.map((it) => (
            <a key={it.href} href={it.href} className={`nav-item${active === it.href ? ' active' : ''}`}>
              {it.label}
            </a>
          ))}
        </nav>
        <div className="side-user">
          <div className="side-user-id">
            <span className="av" aria-hidden>
              {initials(displayName)}
            </span>
            <span className="name">{displayName}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ color: 'var(--argila-100)', borderColor: 'var(--tinta-600)' }}>
            Sair
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="eyebrow">{branding.displayName ?? branding.programName}</div>
          <span className="slogan">Passe adiante.</span>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
