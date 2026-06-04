'use client';
/**
 * First-password / reset form. Reads a one-time token (from the email link),
 * posts {token, password} to /api/auth/password-reset/confirm (same-origin →
 * current tenant). On success the admin can log in. Branding is fetched for the
 * host's tenant so the screen is white-labeled, like the login screen.
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

const MIN_PASSWORD = 8;

/** Maps a confirm error to a specific, honest message. */
function confirmErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Erro ao definir a senha. Tente novamente.';
  if (err.message === 'invalid_reset_token') {
    return 'Este link é inválido ou expirou. Peça um novo ao administrador.';
  }
  if (err.message === 'invalid_password_format') {
    return `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`;
  }
  if (err.code === 'TENANT_NOT_RESOLVED' || err.message === 'no_tenant_login') {
    return 'Workspace não encontrado neste endereço. Verifique o subdomínio da empresa.';
  }
  if (err.status === 429) return 'Muitas tentativas. Aguarde um instante.';
  return 'Erro no servidor. Tente novamente em instantes.';
}

export function SetPasswordForm({ token }: { token: string }) {
  const [branding, setBranding] = useState<Branding>(DEFAULTS);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ branding: Branding }>('/api/branding')
      .then((r) => setBranding(r.branding))
      .catch(() => {});
  }, []);

  const hasToken = token.length > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/password-reset/confirm', { token, password });
      setDone(true);
    } catch (err) {
      setError(confirmErrorMessage(err));
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
          Definir senha
        </h1>

        {done ? (
          <>
            <Banner kind="ok">Senha definida. Você já pode entrar.</Banner>
            <a
              className="btn btn-primary"
              href="/login"
              style={{ width: '100%', marginTop: 'var(--sp-4)', display: 'block', textAlign: 'center' }}
            >
              Ir para o login
            </a>
          </>
        ) : !hasToken ? (
          <Banner kind="error">
            Link inválido: token ausente. Use o link que enviamos ao seu e-mail.
          </Banner>
        ) : (
          <>
            {error ? <Banner kind="error">{error}</Banner> : null}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="password">Nova senha</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="confirm">Confirmar senha</label>
                <input
                  id="confirm"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={busy}
                style={{ width: '100%' }}
              >
                {busy ? 'Salvando…' : 'Definir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
