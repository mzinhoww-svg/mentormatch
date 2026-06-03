'use client';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, useResource, errorMessage } from '../components.js';
import { isAdminRole } from '../nav.js';
import { bestTextContrast, MIN_TEXT_CONTRAST } from '../branding.js';
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
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    programName: string;
    locale: string;
  };
  status: string;
}

const MAX_LOGO_KB = 512;
const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

/** True when even the best text color can't reach AA on this background. */
function lowContrast(value: string): boolean {
  const c = bestTextContrast(value);
  return Number.isFinite(c) && c < MIN_TEXT_CONTRAST;
}

function BrandingSettings() {
  const { data, loading, error, reload } = useResource<{ settings: Settings }>(() =>
    api.get('/api/admin/settings'),
  );
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [logoBusy, setLogoBusy] = useState(false);

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  const b = data.settings.branding;
  const val = (k: string, fallback: string) => form[k] ?? fallback;
  const currentLogo = logo !== undefined ? logo : b.logoUrl;
  const pc = val('primaryColor', b.primaryColor);
  const sc = val('secondaryColor', b.secondaryColor);

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

  async function onPickLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the admin re-pick the same file
    if (!file) return;
    setMsg(null);
    if (!LOGO_TYPES.has(file.type)) {
      setMsg({ kind: 'error', text: 'Formato não suportado (PNG, JPG, WEBP ou SVG).' });
      return;
    }
    if (file.size > MAX_LOGO_KB * 1024) {
      setMsg({ kind: 'error', text: `Logo acima de ${MAX_LOGO_KB} KB.` });
      return;
    }
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/settings/logo', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (!res.ok) throw new Error(body.message ?? 'upload_failed');
      setLogo(body.url ?? null);
      setMsg({ kind: 'ok', text: 'Logo atualizado.' });
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setMsg(null);
    setLogoBusy(true);
    try {
      const res = await fetch('/api/admin/settings/logo', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'remove_failed');
      }
      setLogo(null);
      setMsg({ kind: 'ok', text: 'Logo removido.' });
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <form className="card" style={{ marginTop: 'var(--sp-4)' }} onSubmit={save}>
      <div className="card-h">Branding do tenant (admin)</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="field">
        <label>Logotipo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          {currentLogo ? (
            <img
              src={currentLogo}
              alt="Logo atual"
              style={{ height: 40, width: 'auto', borderRadius: 'var(--r-sm)', background: '#fff' }}
            />
          ) : (
            <span className="muted" style={{ fontSize: 14 }}>
              Sem logo (usa a marca MentorMatch)
            </span>
          )}
          <input
            type="file"
            accept={LOGO_ACCEPT}
            onChange={onPickLogo}
            disabled={logoBusy}
            aria-label="Enviar logotipo"
          />
          {currentLogo ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={removeLogo}
              disabled={logoBusy}
            >
              Remover
            </button>
          ) : null}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          PNG, JPG, WEBP ou SVG · até {MAX_LOGO_KB} KB.
        </p>
      </div>

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
          <input id="pc" className="input" value={pc} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
          {lowContrast(pc) ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Contraste baixo — o texto sobre esta cor pode ficar difícil de ler.
            </p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="sc">Cor secundária</label>
          <input id="sc" className="input" value={sc} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} />
          {lowContrast(sc) ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Contraste baixo — o texto sobre esta cor pode ficar difícil de ler.
            </p>
          ) : null}
        </div>
      </div>
      <button className="btn btn-primary" type="submit">Salvar branding</button>
    </form>
  );
}
