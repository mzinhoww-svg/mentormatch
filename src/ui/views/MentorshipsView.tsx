'use client';
import { useState } from 'react';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, StatusTag, useResource, errorMessage, initials } from '../components.js';

interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
  counterpartName: string | null;
  role: 'mentor' | 'mentee';
}
interface Contact {
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
}

export function MentorshipsView({ currentUserId }: { currentUserId: string }) {
  const { data, error, loading } = useResource<{ mentorships: Mentorship[] }>(() =>
    api.get('/api/mentorship/mentorships'),
  );
  const [contacts, setContacts] = useState<Record<string, Contact | string>>({});

  async function reveal(otherUserId: string) {
    try {
      const r = await api.get<{ contact: Contact }>(
        `/api/mentorship/contact?userId=${encodeURIComponent(otherUserId)}`,
      );
      setContacts((c) => ({ ...c, [otherUserId]: r.contact }));
    } catch (err) {
      setContacts((c) => ({ ...c, [otherUserId]: errorMessage(err) }));
    }
  }

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  const active = data.mentorships.filter((m) => m.status === 'active');
  const past = data.mentorships.filter((m) => m.status !== 'active');

  function card(m: Mentorship) {
    const other = m.mentorId === currentUserId ? m.menteeId : m.mentorId;
    // The viewer's role label describes the counterpart's role to them.
    const roleLabel = m.role === 'mentor' ? 'Você mentora' : 'Mentor(a)';
    const name = m.counterpartName ?? 'Participante';
    const c = contacts[other];
    return (
      <div className="card" key={m.id} style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="av">{initials(name)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{name}</div>
            <div className="muted" style={{ fontSize: 13 }}>{roleLabel}</div>
          </div>
          <StatusTag status={m.status} />
        </div>
        <div style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <a className="btn btn-ghost btn-sm" href="/app/sessions">Ver sessões</a>
          {c === undefined ? (
            <button className="btn btn-ghost btn-sm" onClick={() => reveal(other)}>Ver contato</button>
          ) : typeof c === 'string' ? (
            <span className="muted" style={{ fontSize: 13 }}>contato indisponível</span>
          ) : (
            <span className="mono" style={{ fontSize: 13, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {c.contactEmail ? <span>{c.contactEmail}</span> : null}
              {c.contactPhone ? <span>{c.contactPhone}</span> : null}
              {c.contactWhatsapp ? <span>WhatsApp: {c.contactWhatsapp}</span> : null}
              {!c.contactEmail && !c.contactPhone && !c.contactWhatsapp ? <span>—</span> : null}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Mentorias</h1>
      {data.mentorships.length === 0 ? (
        <div style={{ marginTop: 'var(--sp-5)' }}>
          <EmptyState title="Nenhuma mentoria ativa" hint="Aceite ou solicite uma mentoria para começar." />
        </div>
      ) : (
        <div style={{ marginTop: 'var(--sp-5)' }}>
          {active.length > 0 ? (
            <>
              <div className="session-group">Ativas</div>
              {active.map(card)}
            </>
          ) : null}
          {past.length > 0 ? (
            <>
              <div className="session-group">Encerradas</div>
              {past.map(card)}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
