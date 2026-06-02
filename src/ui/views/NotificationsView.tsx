'use client';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, useResource } from '../components.js';

interface Notification {
  id: string;
  type: string;
  status: 'unread' | 'read';
  createdAt: string;
}
interface Payload {
  notifications: Notification[];
  unread: number;
}

const LABEL: Record<string, string> = {
  'mentorship.requested': 'Nova solicitação de mentoria',
  'mentorship.accepted': 'Mentoria aceita',
  'mentorship.rejected': 'Solicitação recusada',
  'mentorship.cancelled': 'Solicitação cancelada',
  'session.requested': 'Sessão solicitada',
  'session.confirmed': 'Sessão confirmada',
  'session.completed': 'Sessão concluída',
  'session.cancelled': 'Sessão cancelada',
  'auth.login': 'Novo acesso à conta',
  'auth.logout': 'Sessão encerrada',
  'consent.recorded': 'Consentimento registrado',
  'profile.updated': 'Perfil atualizado',
  'profile.capacity_changed': 'Capacidade alterada',
};

export function NotificationsView() {
  const { data, error, loading, reload } = useResource<Payload>(() => api.get('/api/notifications'));

  async function markRead(id: string) {
    await api.post('/api/notifications/read', { notificationId: id }).catch(() => {});
    reload();
  }
  async function markAll() {
    await api.post('/api/notifications/read', { all: true }).catch(() => {});
    reload();
  }

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 className="page-title">Notificações</h1>
        {data.unread > 0 ? <span className="count-pill" data-testid="unread-count">{data.unread}</span> : null}
        <span style={{ flex: 1 }} />
        {data.unread > 0 ? (
          <button className="btn btn-ghost btn-sm" onClick={markAll}>Marcar todas como lidas</button>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
        {data.notifications.length === 0 ? (
          <EmptyState title="Sem notificações" />
        ) : (
          data.notifications.map((n) => (
            <div className="row-item" key={n.id}>
              {n.status === 'unread' ? <span className="unread-dot" aria-label="não lida" /> : <span style={{ width: 8 }} />}
              <span style={{ flex: 1, fontSize: 14, fontWeight: n.status === 'unread' ? 600 : 400 }}>
                {LABEL[n.type] ?? n.type}
              </span>
              <span className="muted mono" style={{ fontSize: 12 }}>
                {new Date(n.createdAt).toLocaleDateString('pt-BR')}
              </span>
              {n.status === 'unread' ? (
                <button className="btn btn-ghost btn-sm" onClick={() => markRead(n.id)}>Marcar lida</button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
