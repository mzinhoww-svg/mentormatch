'use client';
/**
 * Per-tenant customization for the platform console: edit a tenant's branding
 * (colors, program name, logo) without logging in as the tenant, plus upload a
 * design file (JSON or markdown) that prefills the fields. All calls are gated
 * server-side by requirePlatformAdmin and scoped to the given tenantId.
 */
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, useResource, errorMessage } from '../components.js';

interface TenantSettings {
  branding: {
    displayName: string | null;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    programName: string;
    fontFamily: string | null;
    borderRadius: string | null;
    locale: string;
  };
  status: string;
  allowSelfSignup: boolean;
  defaultMentorCapacity: number;
}
interface ParsedDesign {
  primaryColor?: string;
  secondaryColor?: string;
  programName?: string;
  displayName?: string;
  fontFamily?: string;
  borderRadius?: string;
}

interface Overview {
  users: { active: number };
  mentors: { active: number; available: number };
  mentees: { active: number };
  mentorships: { active: number };
  sessions: { total: number };
  capacity: { total: number; used: number; waitlisted: number };
  participationRate: number;
}

const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

export function TenantEditor({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const res = useResource<{ settings: TenantSettings }>(() =>
    api.get(`/api/platform/tenants/settings?tenantId=${encodeURIComponent(tenantId)}`),
  );
  const [form, setForm] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (res.loading) {
    return (
      <div style={{ padding: 'var(--sp-4)' }}>
        <Loading />
      </div>
    );
  }
  if (res.error || !res.data) return <Banner kind="error">{res.error ?? 'erro'}</Banner>;

  const s = res.data.settings;
  const b = s.branding;
  const val = (k: string, fallback: string) => form[k] ?? fallback;
  const currentLogo = logo !== undefined ? logo : b.logoUrl;
  const selfSignup = form.allowSelfSignup !== undefined ? form.allowSelfSignup === 'true' : s.allowSelfSignup;

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      // Only the fields the operator touched are sent (others keep their value).
      const body: Record<string, unknown> = { tenantId };
      for (const k of ['displayName', 'programName', 'primaryColor', 'secondaryColor', 'fontFamily', 'borderRadius', 'locale']) {
        if (form[k] !== undefined) body[k] = form[k];
      }
      if (form.allowSelfSignup !== undefined) body.allowSelfSignup = form.allowSelfSignup === 'true';
      if (form.defaultMentorCapacity !== undefined) {
        const n = Number(form.defaultMentorCapacity);
        if (Number.isFinite(n)) body.defaultMentorCapacity = Math.max(0, Math.round(n));
      }
      await api.post('/api/platform/tenants/settings', body);
      setMsg({ kind: 'ok', text: 'Configurações salvas.' });
      setForm({});
      res.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('tenantId', tenantId);
      fd.append('file', file);
      const r = await fetch('/api/platform/tenants/logo', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const body = (await r.json().catch(() => ({}))) as { url?: string; message?: string };
      if (!r.ok) throw new Error(body.message ?? 'upload_failed');
      setLogo(body.url ?? null);
      setMsg({ kind: 'ok', text: 'Logo atualizado.' });
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onDesign(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/platform/tenants/design', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const body = (await r.json().catch(() => ({}))) as { parsed?: ParsedDesign; message?: string };
      if (!r.ok) throw new Error(body.message ?? 'parse_failed');
      const p = body.parsed ?? {};
      setForm((f) => ({
        ...f,
        ...(p.primaryColor ? { primaryColor: p.primaryColor } : {}),
        ...(p.secondaryColor ? { secondaryColor: p.secondaryColor } : {}),
        ...(p.programName ? { programName: p.programName } : {}),
        ...(p.displayName ? { displayName: p.displayName } : {}),
        ...(p.fontFamily ? { fontFamily: p.fontFamily } : {}),
        ...(p.borderRadius ? { borderRadius: p.borderRadius } : {}),
      }));
      const found = Object.keys(p).length > 0;
      setMsg({
        kind: found ? 'ok' : 'error',
        text: found
          ? 'Campos preenchidos pelo arquivo — revise e salve.'
          : 'Nada reconhecido no arquivo.',
      });
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="card"
      style={{ marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-3)', background: 'var(--paper-2)' }}
    >
      <div className="card-h">{tenantName} — painel</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <TenantStats tenantId={tenantId} />

      <div className="field">
        <label>Arquivo de design (preenche os campos)</label>
        <input
          type="file"
          accept=".md,.json,.txt,text/markdown,application/json,text/plain"
          onChange={onDesign}
          disabled={busy}
          aria-label="Enviar arquivo de design"
        />
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          JSON {'{ primaryColor, secondaryColor, programName, displayName }'} ou markdown com as
          cores #RRGGBB.
        </p>
      </div>

      <div className="field">
        <label>Logotipo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          {currentLogo ? (
            <img
              src={currentLogo}
              alt="Logo"
              style={{ height: 36, background: '#fff', borderRadius: 'var(--r-sm)' }}
            />
          ) : (
            <span className="muted" style={{ fontSize: 14 }}>Sem logo</span>
          )}
          <input
            type="file"
            accept={LOGO_ACCEPT}
            onChange={onLogo}
            disabled={busy}
            aria-label="Enviar logotipo"
          />
        </div>
      </div>

      <form onSubmit={save}>
        <div className="field">
          <label htmlFor={`dn-${tenantId}`}>Nome de exibição</label>
          <input id={`dn-${tenantId}`} className="input" value={val('displayName', b.displayName ?? '')} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor={`pn-${tenantId}`}>Nome do programa</label>
          <input id={`pn-${tenantId}`} className="input" value={val('programName', b.programName)} onChange={(e) => setForm((f) => ({ ...f, programName: e.target.value }))} />
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor={`pc-${tenantId}`}>Cor primária</label>
            <input id={`pc-${tenantId}`} className="input" value={val('primaryColor', b.primaryColor)} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor={`sc-${tenantId}`}>Cor secundária</label>
            <input id={`sc-${tenantId}`} className="input" value={val('secondaryColor', b.secondaryColor)} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor={`ff-${tenantId}`}>Fonte (Google Font)</label>
            <input id={`ff-${tenantId}`} className="input" placeholder="Ex.: Poppins" value={val('fontFamily', b.fontFamily ?? '')} onChange={(e) => setForm((f) => ({ ...f, fontFamily: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor={`br-${tenantId}`}>Border radius</label>
            <input id={`br-${tenantId}`} className="input" placeholder="Ex.: 4px" value={val('borderRadius', b.borderRadius ?? '')} onChange={(e) => setForm((f) => ({ ...f, borderRadius: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor={`lc-${tenantId}`}>Idioma</label>
            <select id={`lc-${tenantId}`} className="input" value={val('locale', b.locale)} onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}>
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español (ES)</option>
              <option value="es-419">Español (LatAm)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={`cap-${tenantId}`}>Capacidade padrão por mentor</label>
            <input id={`cap-${tenantId}`} className="input" type="number" min={0} value={val('defaultMentorCapacity', String(s.defaultMentorCapacity))} onChange={(e) => setForm((f) => ({ ...f, defaultMentorCapacity: e.target.value }))} />
          </div>
        </div>
        <label className="pref-row" style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', marginBottom: 'var(--sp-4)' }}>
          <input type="checkbox" checked={selfSignup} onChange={(e) => setForm((f) => ({ ...f, allowSelfSignup: String(e.target.checked) }))} />
          <span>Permitir auto‑cadastro de membros (página /signup)</span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </form>

      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: 'var(--sp-5) 0' }} />
      <TenantAdminForm tenantId={tenantId} />
      <ResendLinkForm tenantId={tenantId} />
    </div>
  );
}

/** Operational statistics for the tenant (read-only). Non-critical: hidden on error. */
function TenantStats({ tenantId }: { tenantId: string }) {
  const ov = useResource<{ overview: Overview }>(() =>
    api.get(`/api/platform/tenants/overview?tenantId=${encodeURIComponent(tenantId)}`),
  );
  if (ov.loading) {
    return (
      <div style={{ padding: 'var(--sp-3) 0' }}>
        <Loading />
      </div>
    );
  }
  if (ov.error || !ov.data) return null;
  const o = ov.data.overview;
  const Stat = ({ k, v }: { k: string; v: number | string }) => (
    <div className="pstat">
      <div className="pstat-v">{v}</div>
      <div className="pstat-k">{k}</div>
    </div>
  );
  return (
    <div className="pstats">
      <Stat k="Usuários" v={o.users.active} />
      <Stat k="Mentores" v={o.mentors.active} />
      <Stat k="Mentorados" v={o.mentees.active} />
      <Stat k="Mentorias" v={o.mentorships.active} />
      <Stat k="Sessões" v={o.sessions.total} />
      <Stat k="Participação" v={`${Math.round(o.participationRate * 100)}%`} />
      <Stat k="Capacidade" v={`${o.capacity.used}/${o.capacity.total}`} />
      <Stat k="Na fila" v={o.capacity.waitlisted} />
    </div>
  );
}

/** Set or add the admin of this tenant (promotes an existing user or invites a
 *  new one with a set-password link). */
function TenantAdminForm({ tenantId }: { tenantId: string }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLink(null);
    setBusy(true);
    try {
      const r = await api.post<{ created: boolean; emailSent: boolean; setPasswordUrl?: string }>(
        '/api/platform/tenants/admin',
        { tenantId, email: email.trim(), displayName: displayName.trim() || undefined },
      );
      if (r.created) {
        setMsg({
          kind: 'ok',
          text: r.emailSent
            ? 'Admin criado — link de definição de senha enviado por e-mail.'
            : 'Admin criado — e-mail NÃO enviado; envie o link abaixo.',
        });
        if (!r.emailSent && r.setPasswordUrl) setLink(r.setPasswordUrl);
      } else {
        setMsg({ kind: 'ok', text: 'Usuário existente promovido a admin.' });
      }
      setEmail('');
      setDisplayName('');
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 'var(--sp-4)' }}>
      <div className="card-h">Admin do tenant</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}
      {link ? (
        <p className="mono" style={{ fontSize: 12, wordBreak: 'break-all', marginBottom: 'var(--sp-3)' }}>{link}</p>
      ) : null}
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor={`ta-email-${tenantId}`}>E-mail</label>
          <input id={`ta-email-${tenantId}`} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor={`ta-name-${tenantId}`}>Nome (opcional)</label>
          <input id={`ta-name-${tenantId}`} className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" type="submit" disabled={busy}>
        {busy ? 'Salvando…' : 'Definir admin'}
      </button>
    </form>
  );
}

/** Resend a fresh set-password link to an existing user of this tenant. */
function ResendLinkForm({ tenantId }: { tenantId: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLink(null);
    setBusy(true);
    try {
      const r = await api.post<{ emailSent: boolean; setPasswordUrl: string }>(
        '/api/platform/tenants/resend',
        { tenantId, email: email.trim() },
      );
      setMsg({
        kind: 'ok',
        text: r.emailSent ? 'Link reenviado por e-mail.' : 'E-mail NÃO enviado; use o link abaixo.',
      });
      if (!r.emailSent) setLink(r.setPasswordUrl);
      setEmail('');
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) === 'user_not_found' ? 'Nenhum usuário com esse e-mail neste tenant.' : errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="card-h">Reenviar link de senha</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}
      {link ? (
        <p className="mono" style={{ fontSize: 12, wordBreak: 'break-all', marginBottom: 'var(--sp-3)' }}>{link}</p>
      ) : null}
      <div className="field">
        <label htmlFor={`rl-email-${tenantId}`}>E-mail do usuário</label>
        <input id={`rl-email-${tenantId}`} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <button className="btn btn-ghost btn-sm" type="submit" disabled={busy}>
        {busy ? 'Enviando…' : 'Reenviar link'}
      </button>
    </form>
  );
}
