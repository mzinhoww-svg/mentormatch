'use client';
import { useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, useResource, errorMessage } from '../components.js';
import { isAdminRole } from '../nav.js';
import { NOTIFICATION_TYPES } from '../../notifications/types.js';

interface Pref {
  type: string;
  inApp: boolean;
  email: boolean;
}

export function SettingsView() {
  const me = useResource<{ role: string }>(() => api.get('/api/me'));
  const prefs = useResource<{ preferences: Pref[] }>(() => api.get('/api/notifications/preferences'));

  if (me.loading || prefs.loading) return <Loading />;

  const prefMap = new Map((prefs.data?.preferences ?? []).map((p) => [p.type, p]));

  async function toggle(type: string, patch: { inApp?: boolean; email?: boolean }) {
    await api.post('/api/notifications/preferences', { type, ...patch }).catch(() => {});
    prefs.reload();
  }

  return (
    <div>
      <h1 className="page-title">Configurações</h1>

      <section className="card" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="card-h">Preferências de notificação</div>
        {NOTIFICATION_TYPES.map((t) => {
          const p = prefMap.get(t);
          const inApp = p ? p.inApp : true;
          const email = p ? p.email : false;
          return (
            <div className="row-item" key={t}>
              <span style={{ flex: 1, fontSize: 14 }} className="mono">{t}</span>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={inApp} onChange={(e) => toggle(t, { inApp: e.target.checked })} /> in-app
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={email} onChange={(e) => toggle(t, { email: e.target.checked })} /> e-mail
              </label>
            </div>
          );
        })}
      </section>

      {isAdminRole(me.data?.role) ? <BrandingSettings /> : null}
    </div>
  );
}

interface Settings {
  branding: {
    displayName: string | null;
    primaryColor: string;
    secondaryColor: string;
    programName: string;
    locale: string;
  };
  status: string;
}

function BrandingSettings() {
  const { data, loading, error, reload } = useResource<{ settings: Settings }>(() =>
    api.get('/api/admin/settings'),
  );
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  const b = data.settings.branding;
  const val = (k: string, fallback: string) => form[k] ?? fallback;

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/api/admin/settings', form);
      setMsg({ kind: 'ok', text: 'Branding salvo.' });
      setForm({});
      reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  return (
    <form className="card" style={{ marginTop: 'var(--sp-4)' }} onSubmit={save}>
      <div className="card-h">Branding do tenant (admin)</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}
      <div className="field">
        <label htmlFor="dn">Nome de exibição</label>
        <input id="dn" className="input" value={val('displayName', b.displayName ?? '')} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
      </div>
      <div className="field">
        <label htmlFor="pn">Nome do programa</label>
        <input id="pn" className="input" value={val('programName', b.programName)} onChange={(e) => setForm((f) => ({ ...f, programName: e.target.value }))} />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="pc">Cor primária</label>
          <input id="pc" className="input" value={val('primaryColor', b.primaryColor)} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="sc">Cor secundária</label>
          <input id="sc" className="input" value={val('secondaryColor', b.secondaryColor)} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} />
        </div>
      </div>
      <button className="btn btn-primary" type="submit">Salvar branding</button>
    </form>
  );
}
