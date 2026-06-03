'use client';
/**
 * Platform-console login. Posts to /api/platform/login (same-origin → only works
 * on the platform host); on success the mm_platform cookie is set and we enter
 * the console. Not tenant-branded — this is the operator surface.
 */
import { useState, type FormEvent } from 'react';
import { api, ApiError } from './api.js';
import { Lockup } from './Mark.js';
import { Banner } from './components.js';

function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Muitas tentativas. Aguarde um instante.';
    if (err.status === 401) return 'Credenciais inválidas.';
  }
  return 'Erro ao entrar. Tente novamente.';
}

export function PlatformLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/platform/login', { email, password });
      window.location.assign('/console');
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <Lockup height={24} ink="var(--ink)" />
        </div>
        <div className="eyebrow">Plataforma</div>
        <h1 className="page-title" style={{ marginTop: 6, marginBottom: 'var(--sp-5)' }}>
          Console
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
      </div>
    </div>
  );
}
