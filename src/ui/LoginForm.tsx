'use client';
/**
 * Tenant-scoped login form. Posts to /api/auth/login (same-origin → current
 * tenant). On success the mm_session cookie is set by the server and we redirect
 * into the app shell. Branding (logo/name/colors) is fetched for the host's
 * tenant so the login screen is white-labeled.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from './api.js';
import { Lockup } from './Mark.js';
import { Banner } from './components.js';
import { brandingStyle, type Branding } from './branding.js';

const DEFAULTS: Branding = {
  displayName: null,
  logoUrl: null,
  primaryColor: '#FF4A1C',
  secondaryColor: '#1B5C4C',
  inkColor: '#14100D',
  paperColor: '#FBF7F0',
  programName: 'Programa de Mentoria',
  locale: 'pt-BR',
};

/** Maps an auth error to a specific, honest message (not a blanket "invalid"). */
function loginErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Erro ao entrar. Tente novamente.';
  if (err.code === 'TENANT_NOT_RESOLVED' || err.message === 'no_tenant_login') {
    return 'Workspace não encontrado neste endereço. Verifique o subdomínio da empresa.';
  }
  if (err.status === 401) return 'Credenciais inválidas.';
  if (err.status === 429) return 'Muitas tentativas. Aguarde um instante.';
  return 'Erro no servidor. Tente novamente em instantes.';
}

export function LoginForm() {
  const [branding, setBranding] = useState<Branding>(DEFAULTS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [allowSignup, setAllowSignup] = useState(false);

  useEffect(() => {
    api
      .get<{ branding: Branding; allowSelfSignup?: boolean }>('/api/branding')
      .then((r) => {
        setBranding(r.branding);
        setAllowSignup(Boolean(r.allowSelfSignup));
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/auth/login', { email, password });
      window.location.assign('/app');
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap" style={brandingStyle(branding)}>
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
          Entrar
        </h1>
        {error ? <Banner kind="error">{error}</Banner> : null}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        {allowSignup ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 'var(--sp-4)' }}>
            Novo por aqui? <a href="/signup">Criar conta</a>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
