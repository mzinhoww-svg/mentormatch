'use client';
/**
 * Platform operator console: list tenants, provision a new one (wraps the real
 * provisioning flow → emails the set-password link), and suspend/reactivate.
 * Every call is same-origin and gated server-side by requirePlatformAdmin.
 */
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, useResource, errorMessage } from '../components.js';

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: string;
}

export function PlatformConsole({ adminEmail }: { adminEmail: string }) {
  const tenants = useResource<{ tenants: TenantRow[] }>(() => api.get('/api/platform/tenants'));

  async function logout() {
    await api.post('/api/platform/logout').catch(() => {});
    window.location.assign('/console/login');
  }

  const rows = tenants.data?.tenants ?? [];

  return (
    <div className="app-shell" style={{ gridTemplateColumns: '1fr' }}>
      <div className="main">
        <header className="topbar">
          <div className="eyebrow">Console da plataforma</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <span className="muted" style={{ fontSize: 13 }}>{adminEmail}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Sair</button>
          </div>
        </header>
        <div className="content">
          <h1 className="page-title">Tenants</h1>

          <ProvisionForm onProvisioned={() => tenants.reload()} />

          <section className="card" style={{ marginTop: 'var(--sp-5)' }}>
            <div className="card-h">Tenants ({rows.length})</div>
            {tenants.loading ? (
              <Loading />
            ) : tenants.error ? (
              <Banner kind="error">{tenants.error}</Banner>
            ) : rows.length === 0 ? (
              <p className="muted">Nenhum tenant ainda.</p>
            ) : (
              rows.map((t) => <TenantRowItem key={t.id} tenant={t} onChanged={() => tenants.reload()} />)
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function TenantRowItem({ tenant, onChanged }: { tenant: TenantRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const active = tenant.status === 'active';

  async function toggle() {
    setBusy(true);
    try {
      await api.post('/api/platform/tenants/status', {
        tenantId: tenant.id,
        status: active ? 'suspended' : 'active',
      });
      onChanged();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="row-item">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{tenant.name}</div>
        <div className="mono muted" style={{ fontSize: 12 }}>{tenant.slug}</div>
      </div>
      <span className={`tag ${active ? 'tag-green' : 'tag-gray'}`}>{active ? 'ativo' : 'suspenso'}</span>
      <button className="btn btn-ghost btn-sm" onClick={toggle} disabled={busy}>
        {active ? 'Suspender' : 'Reativar'}
      </button>
    </div>
  );
}

interface ProvisionResponse {
  alreadyExisted: boolean;
  emailSent: boolean;
  setPasswordUrl: string;
  tenant: { slug: string; name: string };
}

function ProvisionForm({ onProvisioned }: { onProvisioned: () => void }) {
  const [f, setF] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLink(null);
    setBusy(true);
    try {
      const r = await api.post<ProvisionResponse>('/api/platform/tenants', {
        slug: f.slug,
        name: f.name,
        adminEmail: f.adminEmail,
        adminName: f.adminName,
        programName: f.programName,
        primaryColor: f.primaryColor,
        secondaryColor: f.secondaryColor,
      });
      if (r.alreadyExisted) {
        setMsg({ kind: 'error', text: `O slug "${r.tenant.slug}" já existe.` });
      } else {
        setMsg({
          kind: 'ok',
          text: r.emailSent
            ? 'Tenant criado — e-mail de definição de senha enviado ao admin.'
            : 'Tenant criado — e-mail NÃO enviado; envie o link abaixo ao admin.',
        });
        setLink(r.setPasswordUrl);
        setF({});
        onProvisioned();
      }
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-h">Provisionar tenant</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}
      {link ? (
        <p className="mono" style={{ fontSize: 12, wordBreak: 'break-all', marginBottom: 'var(--sp-4)' }}>
          {link}
        </p>
      ) : null}
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="p-slug">Slug</label>
          <input id="p-slug" className="input" value={f.slug ?? ''} onChange={set('slug')} required />
        </div>
        <div className="field">
          <label htmlFor="p-name">Nome</label>
          <input id="p-name" className="input" value={f.name ?? ''} onChange={set('name')} required />
        </div>
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="p-email">E-mail do admin</label>
          <input id="p-email" className="input" type="email" value={f.adminEmail ?? ''} onChange={set('adminEmail')} required />
        </div>
        <div className="field">
          <label htmlFor="p-adminname">Nome do admin</label>
          <input id="p-adminname" className="input" value={f.adminName ?? ''} onChange={set('adminName')} />
        </div>
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Provisionando…' : 'Provisionar'}
      </button>
    </form>
  );
}
