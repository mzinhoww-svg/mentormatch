'use client';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, useResource } from '../components.js';
import { notificationLabel } from '../../notifications/labels.js';

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

/** Group icon by event family, using the brand tag colors. */
function typeKind(type: string): 'ember' | 'green' | 'gray' {
  if (type.startsWith('mentorship.requested') || type.startsWith('session.requested')) return 'ember';
  if (type.includes('accepted') || type.includes('confirmed') || type.includes('completed')) return 'green';
  return 'gray';
}

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

  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
  const today = data.notifications.filter((n) => isToday(n.createdAt));
  const earlier = data.notifications.filter((n) => !isToday(n.createdAt));

  function row(n: Notification) {
    const kind = typeKind(n.type);
    return (
      <div className="row-item" key={n.id} style={{ flexWrap: 'wrap' }}>
        <span className={`tag tag-${kind}`} aria-hidden style={{ width: 8, height: 8, padding: 0, borderRadius: '50%' }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: n.status === 'unread' ? 600 : 400, minWidth: 0 }}>
          {notificationLabel(n.type)}
        </span>
        {n.status === 'unread' ? <span className="unread-dot" aria-label="não lida" /> : null}
        <span className="muted mono" style={{ fontSize: 12 }}>
          {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
        {n.status === 'unread' ? (
          <button className="btn btn-ghost btn-sm" onClick={() => markRead(n.id)}>Marcar lida</button>
        ) : null}
      </div>
    );
  }

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
          <EmptyState title="Sem notificações" hint="Atualizações de mentorias e sessões aparecem aqui." />
        ) : (
          <>
            {today.length > 0 ? (
              <>
                <div className="session-group">Hoje</div>
                {today.map(row)}
              </>
            ) : null}
            {earlier.length > 0 ? (
              <>
                <div className="session-group">Anteriores</div>
                {earlier.map(row)}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
