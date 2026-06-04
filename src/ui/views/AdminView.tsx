'use client';
import { useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { SkeletonGrid, EmptyState, Banner, StatusTag, ConfirmDialog, useResource, errorMessage } from '../components.js';

interface Overview {
  users: { active: number };
  mentors: { active: number; available: number };
  mentees: { active: number };
  mentorships: { active: number };
  sessions: { total: number; byStatus: Record<string, number> };
  capacity: { total: number; used: number; waitlisted: number };
  participationRate: number;
}
interface User {
  id: string;
  displayName: string | null;
  email: string;
  role: string;
  status: string;
  profileStatus: string | null;
}

function Stat({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="card">
      <div className="stat-k">{k}</div>
      <div className="stat-v" style={{ marginTop: 6 }}>{v}</div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  member: 'Membro',
  program_manager: 'Gestor(a) de programa',
  admin: 'Administrador(a)',
};

/** Invite a new member by e-mail. The server creates the account and sends a
 *  one-time set-password link; in dev the link is shown for copy/paste. */
function InviteMember({ onInvited }: { onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ emailSent: boolean; setPasswordUrl: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.post<{ emailSent: boolean; setPasswordUrl: string }>('/api/admin/members', {
        email: email.trim(),
        displayName: displayName.trim() || undefined,
        role,
      });
      setResult({ emailSent: r.emailSent, setPasswordUrl: r.setPasswordUrl });
      setEmail('');
      setDisplayName('');
      setRole('member');
      onInvited();
    } catch (err) {
      const code = errorMessage(err);
      setError(code === 'email_taken' ? 'Já existe uma conta com esse e-mail.' : 'Não foi possível convidar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 'var(--sp-6)' }}>
      <div className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Convidar membro</div>
      <div className="card">
        {error ? <Banner kind="error">{error}</Banner> : null}
        {result ? (
          <Banner kind="ok">
            {result.emailSent
              ? 'Convite enviado por e-mail com o link para definir a senha.'
              : 'Conta criada. O envio de e-mail não está configurado — compartilhe o link abaixo:'}
            {!result.emailSent ? (
              <div style={{ marginTop: 6, wordBreak: 'break-all', fontSize: 13 }}>{result.setPasswordUrl}</div>
            ) : null}
          </Banner>
        ) : null}
        <form onSubmit={onSubmit} className="admin-invite">
          <div className="field">
            <label htmlFor="inv-email">E-mail</label>
            <input
              id="inv-email"
              className="input"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="inv-name">Nome (opcional)</label>
            <input
              id="inv-name"
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="inv-role">Papel</label>
            <select id="inv-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {Object.entries(ROLE_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Convidando…' : 'Enviar convite'}
          </button>
        </form>
      </div>
    </section>
  );
}

export function AdminView() {
  const ov = useResource<{ overview: Overview }>(() => api.get('/api/admin/overview'));
  const users = useResource<{ users: User[] }>(() => api.get('/api/admin/users'));
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  async function setStatus(userId: string, status: 'active' | 'suspended') {
    await api.post('/api/admin/users/status', { userId, status }).catch(() => {});
    users.reload();
  }
  function doSuspend() {
    if (confirm) setStatus(confirm.id, 'suspended');
    setConfirm(null);
  }

  const allUsers = users.data?.users ?? [];
  const filtered = q.trim()
    ? allUsers.filter((u) => `${u.displayName ?? ''} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
    : allUsers;

  return (
    <div>
      <h1 className="page-title">Administração</h1>

      <section style={{ marginTop: 'var(--sp-5)' }}>
        <div className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Visão operacional</div>
        {ov.loading ? (
          <SkeletonGrid count={4} cols={4} />
        ) : ov.error || !ov.data ? (
          <Banner kind="error">{ov.error ?? 'erro'}</Banner>
        ) : (
          <div className="grid grid-4" data-testid="admin-metrics">
            <Stat k="Usuários ativos" v={ov.data.overview.users.active} />
            <Stat k="Mentores ativos" v={ov.data.overview.mentors.active} />
            <Stat k="Mentorados ativos" v={ov.data.overview.mentees.active} />
            <Stat k="Mentorias ativas" v={ov.data.overview.mentorships.active} />
            <Stat k="Sessões (total)" v={ov.data.overview.sessions.total} />
            <Stat k="Na fila (waitlist)" v={ov.data.overview.capacity.waitlisted} />
            <Stat k="Capacidade usada" v={`${ov.data.overview.capacity.used}/${ov.data.overview.capacity.total}`} />
            <Stat k="Participação" v={`${Math.round(ov.data.overview.participationRate * 100)}%`} />
          </div>
        )}
      </section>

      <InviteMember onInvited={() => users.reload()} />

      <section style={{ marginTop: 'var(--sp-6)' }}>
        <div className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Usuários do tenant</div>
        <div className="card">
          {users.loading ? (
            <SkeletonGrid count={3} cols={3} />
          ) : users.error || !users.data ? (
            <Banner kind="error">{users.error ?? 'erro'}</Banner>
          ) : allUsers.length === 0 ? (
            <EmptyState title="Nenhum usuário" />
          ) : (
            <>
              <div className="admin-toolbar">
                <input
                  className="input"
                  placeholder="Buscar por nome ou e-mail…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Buscar usuários"
                />
                <span className="admin-count">{filtered.length} de {allUsers.length}</span>
              </div>
              {filtered.length === 0 ? (
                <EmptyState title="Nenhum usuário encontrado" hint="Ajuste a busca." />
              ) : (
                filtered.map((u) => (
                  <div className="row-item" key={u.id} style={{ flexWrap: 'wrap' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{u.displayName ?? u.email}</b>{' '}
                      <span className="muted" style={{ fontSize: 13 }}>{u.role}</span>
                    </span>
                    <StatusTag status={u.status} />
                    {u.status === 'active' ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ id: u.id, name: u.displayName ?? u.email })}>
                        Suspender
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setStatus(u.id, 'active')}>
                        Reativar
                      </button>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title="Suspender usuário?"
        message={confirm ? `${confirm.name} perderá o acesso até ser reativado.` : ''}
        confirmLabel="Suspender"
        cancelLabel="Voltar"
        onConfirm={doSuspend}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
