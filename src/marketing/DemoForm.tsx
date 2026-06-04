'use client';
import { useState, type FormEvent } from 'react';
import { HEADCOUNT_OPTIONS, DEMO_REASSURANCE } from './content.js';

type Field = 'name' | 'company' | 'role' | 'email' | 'headcount';
const FREE_EMAIL = /@(gmail|hotmail|outlook|yahoo|icloud|proton|live|bol|uol)\./i;

/** Demo-request form. Posts to the same-origin institutional endpoint. */
export function DemoForm() {
  const [form, setForm] = useState<Record<Field, string>>({ name: '', company: '', role: '', email: '', headcount: '' });
  const [errs, setErrs] = useState<Partial<Record<Field, string>>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (k: Field) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrs((p) => ({ ...p, [k]: undefined }));
  };

  function validate(): boolean {
    const next: Partial<Record<Field, string>> = {};
    if (!form.name.trim()) next.name = 'Informe seu nome.';
    if (!form.company.trim()) next.company = 'Informe a empresa.';
    if (!form.role.trim()) next.role = 'Informe seu cargo.';
    if (!form.email.trim()) next.email = 'Informe um e-mail.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = 'E-mail inválido.';
    else if (FREE_EMAIL.test(form.email)) next.email = 'Use um e-mail corporativo.';
    if (!form.headcount) next.headcount = 'Selecione o tamanho do time.';
    setErrs(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
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

  const fieldCls = (k: Field) => `input${errs[k] ? ' invalid' : ''}`;

  return (
    <form className="mk-form" onSubmit={onSubmit} aria-label="Solicitar demonstração" noValidate>
      {state === 'error' && error ? <div className="banner banner-error">Não foi possível enviar agora. Tente novamente em instantes.</div> : null}
      <div className="field">
        <label htmlFor="name">Nome</label>
        <input id="name" className={fieldCls('name')} value={form.name} onChange={set('name')}
          aria-invalid={!!errs.name} aria-describedby={errs.name ? 'err-name' : undefined} />
        {errs.name ? <span className="err" id="err-name">{errs.name}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="company">Empresa</label>
        <input id="company" className={fieldCls('company')} value={form.company} onChange={set('company')}
          aria-invalid={!!errs.company} aria-describedby={errs.company ? 'err-company' : undefined} />
        {errs.company ? <span className="err" id="err-company">{errs.company}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="role">Cargo</label>
        <input id="role" className={fieldCls('role')} value={form.role} onChange={set('role')}
          aria-invalid={!!errs.role} aria-describedby={errs.role ? 'err-role' : undefined} />
        {errs.role ? <span className="err" id="err-role">{errs.role}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="email">E-mail corporativo</label>
        <input id="email" className={fieldCls('email')} type="email" value={form.email} onChange={set('email')}
          aria-invalid={!!errs.email} aria-describedby={errs.email ? 'err-email' : undefined} />
        {errs.email ? <span className="err" id="err-email">{errs.email}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="headcount">Número de colaboradores</label>
        <select id="headcount" className={`select${errs.headcount ? ' invalid' : ''}`} value={form.headcount} onChange={set('headcount')}
          aria-invalid={!!errs.headcount} aria-describedby={errs.headcount ? 'err-headcount' : undefined}>
          <option value="">Selecione…</option>
          {HEADCOUNT_OPTIONS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        {errs.headcount ? <span className="err" id="err-headcount">{errs.headcount}</span> : null}
      </div>
      <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Enviando…' : 'Solicitar Demonstração'}
      </button>
      <p className="mk-form-note"><span className="dot" />{DEMO_REASSURANCE}</p>
    </form>
  );
}
