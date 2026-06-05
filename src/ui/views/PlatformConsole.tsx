'use client';
/**
 * Platform operator console: list tenants, provision a new one (wraps the real
 * provisioning flow → emails the set-password link), and suspend/reactivate.
 * Every call is same-origin and gated server-side by requirePlatformAdmin.
 */
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, PageHeader, useResource, errorMessage } from '../components.js';
import { TenantEditor } from './TenantEditor.js';

interface TenantUsage {
  users: number;
  mentorships: number;
  sessions: number;
}
interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: string;
  usage?: TenantUsage;
}

export function PlatformConsole({ adminEmail, adminId }: { adminEmail: string; adminId: string }) {
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
          <PageHeader title="Tenants" subtitle="Gerencie os clientes da plataforma e suas configurações." />

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

          <PlatformAdmins currentAdminId={adminId} />

          <ChangePassword />
        </div>
      </div>
    </div>
  );
}

function TenantRowItem({ tenant, onChanged }: { tenant: TenantRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
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
    <div>
      <div className="row-item">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{tenant.name}</div>
          <div className="mono muted" style={{ fontSize: 12 }}>
            {tenant.slug} · {open ? 'fechar' : 'personalizar'}
          </div>
        </button>
        {tenant.usage ? (
          <span className="mono muted" style={{ fontSize: 12 }} title="usuários · mentorias ativas · sessões">
            {tenant.usage.users}u · {tenant.usage.mentorships}m · {tenant.usage.sessions}s
          </span>
        ) : null}
        <span className={`tag ${active ? 'tag-green' : 'tag-gray'}`}>{active ? 'ativo' : 'suspenso'}</span>
        <button className="btn btn-ghost btn-sm" onClick={toggle} disabled={busy}>
          {active ? 'Suspender' : 'Reativar'}
        </button>
      </div>
      {open ? <TenantEditor tenantId={tenant.id} tenantName={tenant.name} /> : null}
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

interface AdminRow {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
}

function adminErrorMessage(code: string): string {
  switch (code) {
    case 'email_taken':
      return 'Já existe um admin com esse e-mail.';
    case 'weak_password':
      return 'A senha precisa ter ao menos 8 caracteres.';
    case 'invalid_email':
      return 'E-mail inválido.';
    case 'cannot_change_own_status':
      return 'Você não pode alterar o seu próprio status.';
    case 'cannot_suspend_last_admin':
      return 'Não é possível suspender o último admin ativo.';
    default:
      return 'Não foi possível concluir. Tente novamente.';
  }
}

/** Manage other platform operators: list, add (with an initial password), and
 *  suspend/reactivate. The signed-in admin can't change their own status. */
function PlatformAdmins({ currentAdminId }: { currentAdminId: string }) {
  const admins = useResource<{ admins: AdminRow[] }>(() => api.get('/api/platform/admins'));
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ kind: 'error', text: 'A senha precisa ter ao menos 8 caracteres.' });
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/platform/admins', { email: email.trim(), displayName: displayName.trim() || undefined, password });
      setMsg({ kind: 'ok', text: 'Admin adicionado.' });
      setEmail('');
      setDisplayName('');
      setPassword('');
      admins.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: adminErrorMessage(errorMessage(err)) });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: 'active' | 'suspended') {
    setMsg(null);
    try {
      await api.post('/api/platform/admins/status', { adminId: id, status });
      admins.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: adminErrorMessage(errorMessage(err)) });
    }
  }

  const rows = admins.data?.admins ?? [];

  return (
    <section className="card" style={{ marginTop: 'var(--sp-5)' }}>
      <div className="card-h">Administradores da plataforma ({rows.length})</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}
      {admins.loading ? (
        <Loading />
      ) : admins.error ? (
        <Banner kind="error">{admins.error}</Banner>
      ) : (
        rows.map((a) => {
          const isActive = a.status === 'active';
          const isSelf = a.id === currentAdminId;
          return (
            <div className="row-item" key={a.id}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{a.displayName ?? a.email}</b>{' '}
                <span className="muted" style={{ fontSize: 13 }}>{a.email}{isSelf ? ' (você)' : ''}</span>
              </span>
              <span className={`tag ${isActive ? 'tag-green' : 'tag-gray'}`}>{isActive ? 'ativo' : 'suspenso'}</span>
              {isSelf ? null : (
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a.id, isActive ? 'suspended' : 'active')}>
                  {isActive ? 'Suspender' : 'Reativar'}
                </button>
              )}
            </div>
          );
        })
      )}

      <form onSubmit={add} style={{ marginTop: 'var(--sp-4)' }}>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="pa-email">E-mail</label>
            <input id="pa-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pa-name">Nome (opcional)</label>
            <input id="pa-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pa-pw">Senha inicial</label>
          <input id="pa-pw" className="input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Adicionando…' : 'Adicionar admin'}
        </button>
      </form>
    </section>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({ kind: 'error', text: 'A nova senha precisa ter ao menos 8 caracteres.' });
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/platform/password', { currentPassword: current, newPassword: next });
      setMsg({ kind: 'ok', text: 'Senha alterada.' });
      setCurrent('');
      setNext('');
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ marginTop: 'var(--sp-5)' }}>
      <div className="card-h">Trocar minha senha</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}
      <form onSubmit={submit}>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="cur-pw">Senha atual</label>
            <input id="cur-pw" className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="new-pw">Nova senha</label>
            <input id="new-pw" className="input" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Trocar senha'}
        </button>
      </form>
    </section>
  );
}
