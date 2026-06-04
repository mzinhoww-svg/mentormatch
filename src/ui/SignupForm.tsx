'use client';
/**
 * Tenant member self-signup. Only usable when the tenant has self-signup enabled
 * (`allowSelfSignup`, exposed by /api/branding); the server also enforces it.
 * Consent is mandatory. On success the session cookie is set and we enter /app.
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
  fontFamily: null,
  borderRadius: null,
};

function signupErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Erro ao criar conta. Tente novamente.';
  if (err.message === 'signup_disabled') {
    return 'O cadastro está desabilitado para esta empresa. Fale com o administrador.';
  }
  if (err.message === 'email_taken') return 'Já existe uma conta com este e-mail nesta empresa.';
  if (err.message === 'consent_required') return 'É necessário aceitar os termos para continuar.';
  if (err.message === 'invalid_credentials_format') {
    return 'E-mail inválido ou senha com menos de 8 caracteres.';
  }
  if (err.code === 'TENANT_NOT_RESOLVED' || err.message === 'no_tenant') {
    return 'Workspace não encontrado neste endereço. Verifique o subdomínio da empresa.';
  }
  if (err.status === 429) return 'Muitas tentativas. Aguarde um instante.';
  return 'Erro no servidor. Tente novamente em instantes.';
}

export function SignupForm() {
  const [branding, setBranding] = useState<Branding>(DEFAULTS);
  const [allowed, setAllowed] = useState<boolean | null>(null); // null = carregando
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ branding: Branding; allowSelfSignup?: boolean }>('/api/branding')
      .then((r) => {
        setBranding(r.branding);
        setAllowed(Boolean(r.allowSelfSignup));
      })
      .catch(() => setAllowed(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError('É necessário aceitar os termos para continuar.');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter ao menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/signup', { email, password, displayName, consent });
      window.location.assign('/app');
    } catch (err) {
      setError(signupErrorMessage(err));
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
          Criar conta
        </h1>

        {allowed === false ? (
          <>
            <Banner kind="error">
              O cadastro está desabilitado para esta empresa. Fale com o administrador.
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
          <>
            {error ? <Banner kind="error">{error}</Banner> : null}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="su-name">Nome</label>
                <input id="su-name" className="input" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="su-email">E-mail</label>
                <input id="su-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="su-password">Senha</label>
                <input id="su-password" className="input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, marginBottom: 'var(--sp-4)' }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Li e aceito os termos de uso e a política de privacidade.</span>
              </label>
              <button className="btn btn-primary" type="submit" disabled={busy || allowed === null} style={{ width: '100%' }}>
                {busy ? 'Criando…' : 'Criar conta'}
              </button>
            </form>
            <p className="muted" style={{ fontSize: 13, marginTop: 'var(--sp-4)' }}>
              Já tem conta? <a href="/login">Entrar</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
