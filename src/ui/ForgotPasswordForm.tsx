'use client';
/**
 * "Forgot password" — requests a reset link. Non-enumerating: always shows the
 * same confirmation regardless of whether the email exists. The email (if any)
 * carries a link to the existing /set-password page.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { api } from './api.js';
import { Lockup } from './Mark.js';
import { Banner } from './components.js';
import { brandingStyle, type Branding } from './branding.js';
import { FontLoader } from './FontLoader.js';

const DEFAULTS: Branding = {
  displayName: null,
  logoUrl: null,
  primaryColor: '#FF4A1C',
  secondaryColor: '#1B5C4C',
  inkColor: '#14100D',
  paperColor: '#FBF7F0',
  programName: 'Programa de Mentoria',
  locale: 'pt-BR',
  fontFamily: null,
  borderRadius: null,
};

export function ForgotPasswordForm() {
  const [branding, setBranding] = useState<Branding>(DEFAULTS);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ branding: Branding }>('/api/branding')
      .then((r) => setBranding(r.branding))
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/auth/password-reset/request', { email });
    } catch {
      /* non-enumerating: never reveal whether the email exists */
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <div className="auth-wrap" style={brandingStyle(branding)}>
      <FontLoader fontFamily={branding.fontFamily} />
      <div className="auth-card card">
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.displayName ?? 'Logo'} style={{ height: 32 }} />
          ) : (
            <Lockup height={24} ink="var(--ink)" />
          )}
        </div>
        <div className="eyebrow">{branding.displayName ?? branding.programName}</div>
        <h1 className="page-title" style={{ marginTop: 6, marginBottom: 'var(--sp-5)' }}>
          Esqueci minha senha
        </h1>
        {sent ? (
          <>
            <Banner kind="ok">
              Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.
            </Banner>
            <a
              className="btn btn-ghost"
              href="/login"
              style={{ width: '100%', marginTop: 'var(--sp-4)', display: 'block', textAlign: 'center' }}
            >
              Voltar ao login
            </a>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="fp-email">E-mail</label>
              <input
                id="fp-email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Enviando…' : 'Enviar link'}
            </button>
            <p className="muted" style={{ fontSize: 13, marginTop: 'var(--sp-4)' }}>
              Lembrou? <a href="/login">Entrar</a>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
