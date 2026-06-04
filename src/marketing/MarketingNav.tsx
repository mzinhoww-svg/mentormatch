'use client';
import { useState, useEffect } from 'react';
import { Lockup } from '../ui/Mark.js';
import { MARKETING_ROUTES } from './seo.js';

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

/** Institutional top nav with an accessible mobile drawer. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const links = MARKETING_ROUTES.filter((r) => r.href !== '/');

  // Lock scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="mk-nav">
      <a href="/" className="mk-nav-brand" aria-label="MentorMatch — início">
        <Lockup height={22} ink="var(--ink)" />
      </a>

      <nav className="mk-nav-links" aria-label="Navegação">
        {links.map((r) => (
          <a key={r.href} href={r.href}>{r.label}</a>
        ))}
      </nav>

      <div className="mk-nav-cta">
        <a className="btn btn-ghost btn-sm" href="/login">Entrar</a>
        <a className="btn btn-primary btn-sm" href="/demo">Solicitar Demonstração</a>
      </div>

      <button
        className="mk-nav-toggle"
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="mk-mobile-drawer"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      <div id="mk-mobile-drawer" className={`mk-nav-drawer${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu de navegação">
        <button className="close" aria-label="Fechar menu" onClick={() => setOpen(false)}>
          <CloseIcon />
        </button>
        <nav aria-label="Navegação móvel">
          {links.map((r) => (
            <a key={r.href} href={r.href} onClick={() => setOpen(false)}>{r.label}</a>
          ))}
        </nav>
        <div className="drawer-cta">
          <a className="btn btn-primary" href="/demo" onClick={() => setOpen(false)}>Solicitar Demonstração</a>
          <a className="btn btn-ghost" href="/login" style={{ color: 'var(--argila-100)', borderColor: 'var(--tinta-600)' }} onClick={() => setOpen(false)}>Entrar</a>
        </div>
      </div>
    </header>
  );
}
