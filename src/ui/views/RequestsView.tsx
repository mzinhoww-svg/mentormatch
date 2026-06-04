'use client';
import { useState } from 'react';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, StatusTag, ConfirmDialog, useResource } from '../components.js';

interface Req {
  id: string;
  menteeId: string;
  mentorId: string;
  skillId: string | null;
  status: string;
  createdAt: string;
  menteeName: string | null;
  mentorName: string | null;
  skillName: string | null;
}
interface Payload {
  asMentor: Req[];
  asMentee: Req[];
}

export function RequestsView() {
  const { data, error, loading, reload } = useResource<Payload>(() =>
    api.get('/api/mentorship/requests'),
  );
  const [confirmReject, setConfirmReject] = useState<string | null>(null);

  async function act(path: string, requestId: string) {
    await api.post(path, { requestId }).catch(() => {});
    reload();
  }
  function doReject() {
    if (confirmReject) act('/api/mentorship/requests/reject', confirmReject);
    setConfirmReject(null);
  }

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  const open = (r: Req) => r.status === 'pending' || r.status === 'waitlisted';
  const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

  return (
    <div>
      <h1 className="page-title">Solicitações</h1>

      <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="card-h">Recebidas (como mentor)</div>
        {data.asMentor.length === 0 ? (
          <EmptyState title="Nenhuma solicitação recebida" hint="Quando alguém solicitar sua mentoria, aparece aqui." />
        ) : (
          data.asMentor.map((r) => (
            <div className="row-item" key={r.id} style={{ flexWrap: 'wrap' }}>
              <StatusTag status={r.status} />
              <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>
                <b style={{ fontWeight: 600 }}>{r.menteeName ?? 'Mentorado'}</b>
                {r.skillName ? <span className="muted"> · busca {r.skillName}</span> : null}
                <span className="muted mono" style={{ fontSize: 12 }}> · {when(r.createdAt)}</span>
              </span>
              {open(r) ? (
                <span style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => act('/api/mentorship/requests/accept', r.id)}>Aceitar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReject(r.id)}>Recusar</button>
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="card-h">Enviadas (como mentorado)</div>
        {data.asMentee.length === 0 ? (
          <EmptyState title="Nenhuma solicitação enviada" hint="Encontre um mentor no diretório e solicite uma mentoria." />
        ) : (
          data.asMentee.map((r) => (
            <div className="row-item" key={r.id} style={{ flexWrap: 'wrap' }}>
              <StatusTag status={r.status} />
              <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>
                <b style={{ fontWeight: 600 }}>{r.mentorName ?? 'Mentor'}</b>
                {r.skillName ? <span className="muted"> · {r.skillName}</span> : null}
                <span className="muted mono" style={{ fontSize: 12 }}> · {when(r.createdAt)}</span>
              </span>
              {open(r) ? (
                <button className="btn btn-ghost btn-sm" onClick={() => act('/api/mentorship/requests/cancel', r.id)}>Cancelar</button>
              ) : null}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirmReject !== null}
        title="Recusar solicitação?"
        message="O mentorado será notificado. Você pode receber novas solicitações no futuro."
        confirmLabel="Recusar"
        cancelLabel="Voltar"
        onConfirm={doReject}
        onCancel={() => setConfirmReject(null)}
      />
    </div>
  );
}
