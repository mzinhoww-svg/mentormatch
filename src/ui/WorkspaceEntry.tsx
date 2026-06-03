'use client';
/**
 * Root/institutional /login entry. There is no global login — the user enters
 * their company workspace (slug) and is sent to that tenant's login host
 * ({slug}.<base>/login), where auth is tenant-scoped (RLS-isolated). Never
 * authenticates here.
 */
import { useState, type FormEvent } from 'react';
import { Lockup } from './Mark.js';
import { Banner } from './components.js';
import { buildWorkspaceLoginUrl, isValidWorkspaceSlug } from './workspace.js';

export function WorkspaceEntry() {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidWorkspaceSlug(slug)) {
      setError('Informe um identificador válido (ex.: acme).');
      return;
    }
    const url = buildWorkspaceLoginUrl(window.location.host, window.location.protocol, slug);
    if (!url) {
      setError('Não foi possível montar o endereço da sua empresa.');
      return;
    }
    window.location.assign(url);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <Lockup height={24} ink="var(--ink)" />
        </div>
        <div className="eyebrow">Acesso</div>
        <h1 className="page-title" style={{ marginTop: 6, marginBottom: 8 }}>
          Entrar na sua empresa
        </h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 'var(--sp-5)' }}>
          O acesso é por empresa. Informe o identificador do seu workspace para continuar.
        </p>
        {error ? <Banner kind="error">{error}</Banner> : null}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="slug">Identificador da empresa</label>
            <input
              id="slug"
              className="input"
              placeholder="ex.: acme"
              autoCapitalize="none"
              autoCorrect="off"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
            Continuar
          </button>
        </form>
        <p className="muted" style={{ fontSize: 13, marginTop: 'var(--sp-4)' }}>
          Ainda não usa o MentorMatch? <a href="/demo">Solicitar demonstração</a>.
        </p>
      </div>
    </div>
  );
}
