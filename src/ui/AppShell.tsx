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
import { NavIcon } from './NavIcon.js';
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
  // Web: collapse the sidebar. Mobile: open it as an off-canvas drawer. One ☰
  // toggle drives the right one based on viewport.
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function toggleNav() {
    if (typeof window !== 'undefined' && window.innerWidth <= 860) setDrawerOpen((o) => !o);
    else setCollapsed((c) => !c);
  }
  const closeDrawer = () => setDrawerOpen(false);

  async function logout() {
    await api.post('/api/auth/logout').catch(() => {});
    window.location.assign('/login');
  }

  return (
    <div
      className={`app-shell${collapsed ? ' nav-collapsed' : ''}${drawerOpen ? ' nav-drawer-open' : ''}`}
      style={brandingStyle(branding)}
    >
      <FontLoader fontFamily={branding.fontFamily} />
      {drawerOpen ? (
        <button className="nav-backdrop" aria-label="Fechar menu" onClick={closeDrawer} />
      ) : null}
      <aside className="side">
        <div className="side-brand">
          <Lockup height={22} ink="var(--argila-50)" />
        </div>
        <nav className="side-nav" aria-label="Navegação principal">
          {items.map((it) => (
            <a
              key={it.href}
              href={it.href}
              onClick={closeDrawer}
              className={`nav-item${active === it.href ? ' active' : ''}`}
            >
              <NavIcon name={it.icon} />
              <span>{it.label}</span>
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
            <button className="nav-toggle" onClick={toggleNav} aria-label="Alternar menu" title="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
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
            <NavIcon name={it.icon} size={21} />
            <span>{it.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
