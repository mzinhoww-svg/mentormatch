'use client';
/**
 * Authenticated app shell: branded sidebar nav (filtered by role), header, and
 * content area. Tenant branding is applied via CSS vars on the shell root.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Lockup } from './Mark.js';
import { api } from './api.js';
import { navForRole, activeHref } from './nav.js';
import { brandingStyle, type Branding } from './branding.js';
import { initials } from './components.js';
import { FontLoader } from './FontLoader.js';

/** Topbar notification bell with an unread count. Polls on mount + when the
 *  route changes (cheap, same-origin) so the badge stays roughly fresh. */
function NotificationBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get<{ unread: number }>('/api/notifications')
      .then((r) => alive && setUnread(r.unread ?? 0))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  const label = unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações';
  return (
    <a href="/app/notifications" className="topbar-bell" aria-label={label} title={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {unread > 0 ? <span className="count-pill topbar-bell-count">{unread > 99 ? '99+' : unread}</span> : null}
    </a>
  );
}

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
      <FontLoader fontFamily={branding.fontFamily} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 0 }}>
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.displayName ?? 'Logo'}
                style={{ height: 24, width: 'auto', flexShrink: 0 }}
              />
            ) : null}
            <div className="eyebrow">{branding.displayName ?? branding.programName}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <NotificationBell />
            <span className="slogan">Passe adiante.</span>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>

      <nav className="mm-bottom-nav" aria-label="Navegação (mobile)">
        {items.slice(0, 5).map((it) => (
          <a key={it.href} href={it.href} className={active === it.href ? 'active' : ''}>
            {it.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
