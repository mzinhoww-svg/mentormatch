'use client';
import { useState, type FormEvent } from 'react';
import { HEADCOUNT_OPTIONS } from './content.js';

/** Demo-request form. Posts to the same-origin institutional endpoint. */
export function DemoForm() {
  const [form, setForm] = useState({ name: '', company: '', role: '', email: '', headcount: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(d.message ?? 'erro');
      }
      setState('ok');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'erro');
    }
  }

  if (state === 'ok') {
    return (
      <div className="mk-form-ok" role="status" data-testid="demo-success">
        <div className="serif" style={{ fontSize: 26 }}>Recebemos seu pedido.</div>
        <p>Em breve entraremos em contato para agendar sua demonstração. Passe adiante.</p>
      </div>
    );
  }

  return (
    <form className="mk-form" onSubmit={onSubmit} aria-label="Solicitar demonstração">
      {error ? <div className="banner banner-error">Verifique os campos: {error}</div> : null}
      <div className="field">
        <label htmlFor="name">Nome</label>
        <input id="name" className="input" value={form.name} onChange={set('name')} required />
      </div>
      <div className="field">
        <label htmlFor="company">Empresa</label>
        <input id="company" className="input" value={form.company} onChange={set('company')} required />
      </div>
      <div className="field">
        <label htmlFor="role">Cargo</label>
        <input id="role" className="input" value={form.role} onChange={set('role')} required />
      </div>
      <div className="field">
        <label htmlFor="email">E-mail corporativo</label>
        <input id="email" className="input" type="email" value={form.email} onChange={set('email')} required />
      </div>
      <div className="field">
        <label htmlFor="headcount">Número de colaboradores</label>
        <select id="headcount" className="select" value={form.headcount} onChange={set('headcount')} required>
          <option value="">Selecione…</option>
          {HEADCOUNT_OPTIONS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Enviando…' : 'Solicitar Demonstração'}
      </button>
    </form>
  );
}
