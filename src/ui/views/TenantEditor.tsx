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
  };
}
interface ParsedDesign {
  primaryColor?: string;
  secondaryColor?: string;
  programName?: string;
  displayName?: string;
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

  const b = res.data.settings.branding;
  const val = (k: string, fallback: string) => form[k] ?? fallback;
  const currentLogo = logo !== undefined ? logo : b.logoUrl;

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await api.post('/api/platform/tenants/settings', { tenantId, ...form });
      setMsg({ kind: 'ok', text: 'Marca salva.' });
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
      <div className="card-h">Personalizar — {tenantName}</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

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
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar marca'}
        </button>
      </form>
    </div>
  );
}
