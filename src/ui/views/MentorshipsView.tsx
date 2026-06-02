'use client';
import { useState } from 'react';
import { api } from '../api.js';
import { Loading, EmptyState, Banner, useResource, errorMessage } from '../components.js';

interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
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

  return (
    <div>
      <h1 className="page-title">Mentorias</h1>
      {data.mentorships.length === 0 ? (
        <div style={{ marginTop: 'var(--sp-5)' }}>
          <EmptyState title="Nenhuma mentoria ativa" hint="Aceite ou solicite uma mentoria para começar." />
        </div>
      ) : (
        <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
          {data.mentorships.map((m) => {
            const other = m.mentorId === currentUserId ? m.menteeId : m.mentorId;
            const role = m.mentorId === currentUserId ? 'Mentorado' : 'Mentor';
            const c = contacts[other];
            return (
              <div className="row-item" key={m.id} style={{ flexWrap: 'wrap' }}>
                <span className={`tag ${m.status === 'active' ? 'tag-green' : 'tag-gray'}`}>{m.status}</span>
                <span style={{ flex: 1, fontSize: 14 }}>
                  {role} {other.slice(0, 8)}
                </span>
                {c === undefined ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => reveal(other)}>
                    Ver contato
                  </button>
                ) : typeof c === 'string' ? (
                  <span className="muted" style={{ fontSize: 13 }}>contato indisponível</span>
                ) : (
                  <span className="mono" style={{ fontSize: 13 }}>{c.contactEmail ?? '—'}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
