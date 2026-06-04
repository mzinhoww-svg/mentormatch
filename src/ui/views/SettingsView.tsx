'use client';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, useResource, errorMessage } from '../components.js';
import { isAdminRole } from '../nav.js';
import { CustomDomains } from './CustomDomains.js';
import { notificationLabel } from '../../notifications/labels.js';
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
        <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 'var(--sp-4)' }}>
          Escolha como deseja ser avisado de cada evento.
        </p>
        {NOTIFICATION_TYPES.map((t) => {
          const p = prefMap.get(t);
          const inApp = p ? p.inApp : true;
          const email = p ? p.email : false;
          return (
            <div className="pref-row" key={t}>
              <span className="pref-name">{notificationLabel(t)}</span>
              <div className="pref-checks">
                <label>
                  <input type="checkbox" checked={inApp} onChange={(e) => toggle(t, { inApp: e.target.checked })} /> in-app
                </label>
                <label>
                  <input type="checkbox" checked={email} onChange={(e) => toggle(t, { email: e.target.checked })} /> e-mail
                </label>
              </div>
            </div>
          );
        })}
      </section>

      {isAdminRole(me.data?.role) ? (
        <>
          <BrandingSettings />
          <CustomDomains />
        </>
      ) : null}
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
    fontFamily: string | null;
    borderRadius: string | null;
  };
  status: string;
}

interface ParsedDesign {
  title: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  borderRadius: string | null;
  palette: string[];
  warnings: string[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Color input (swatch + hex text). Hoisted so it never remounts mid-typing. */
function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const safe = HEX.test(value) ? value : '#000000';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="color-field">
        <input
          type="color"
          className="color-swatch"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} (seletor)`}
        />
        <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" />
      </div>
    </div>
  );
}

function BrandingSettings() {
  const { data, loading, error, reload } = useResource<{ settings: Settings }>(() =>
    api.get('/api/admin/settings'),
  );
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [design, setDesign] = useState<ParsedDesign | null>(null);
  const [parsing, setParsing] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const designRef = useRef<HTMLInputElement>(null);

  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;

  const b = data.settings.branding;
  const val = (k: string, fallback: string) => form[k] ?? fallback;
  const primary = val('primaryColor', b.primaryColor);
  const secondary = val('secondaryColor', b.secondaryColor);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!HEX.test(primary) || !HEX.test(secondary)) {
      setMsg({ kind: 'error', text: 'Use cores no formato #RRGGBB.' });
      return;
    }
    try {
      await api.post('/api/admin/settings', form);
      setMsg({ kind: 'ok', text: 'Branding salvo.' });
      setForm({});
      reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  async function onLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.upload('/api/admin/settings/logo', fd);
      setMsg({ kind: 'ok', text: 'Logo atualizado.' });
      reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  }

  async function onDesignFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setMsg(null);
    setDesign(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.upload<{ parsed: ParsedDesign }>('/api/admin/settings/design', fd);
      setDesign(r.parsed);
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setParsing(false);
      if (designRef.current) designRef.current.value = '';
    }
  }

  /** Stages the parsed DESIGN.md tokens into the form (admin still clicks Save). */
  function applyDesign() {
    if (!design) return;
    setForm((f) => ({
      ...f,
      ...(design.primaryColor ? { primaryColor: design.primaryColor } : {}),
      ...(design.secondaryColor ? { secondaryColor: design.secondaryColor } : {}),
      ...(design.fontFamily ? { fontFamily: design.fontFamily } : {}),
      ...(design.borderRadius ? { borderRadius: design.borderRadius } : {}),
    }));
    setDesign(null);
    setMsg({ kind: 'ok', text: 'Tokens aplicados ao formulário. Revise e salve.' });
  }

  return (
    <form className="card" style={{ marginTop: 'var(--sp-4)' }} onSubmit={save}>
      <div className="card-h">Branding do tenant (admin)</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      {/* Logo */}
      <div className="field">
        <label>Logo do programa</label>
        <div className="logo-row">
          <span className="logo-box">
            {b.logoUrl ? <img src={b.logoUrl} alt="Logo do tenant" /> : <span className="empty">SEM LOGO</span>}
          </span>
          <div>
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoFile} style={{ display: 'none' }} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}>
              {uploadingLogo ? 'Enviando…' : b.logoUrl ? 'Trocar logo' : 'Enviar logo'}
            </button>
            <p className="pf-hint">PNG, JPG, WebP ou SVG · até 1 MB</p>
          </div>
        </div>
      </div>

      {/* DESIGN.md import */}
      <div className="field">
        <label>Importar de um DESIGN.md</label>
        <input ref={designRef} type="file" accept=".md,text/markdown,text/plain" onChange={onDesignFile} style={{ display: 'none' }} />
        <div
          className="design-drop"
          role="button"
          tabIndex={0}
          onClick={() => designRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              designRef.current?.click();
            }
          }}
        >
          <div className="big">{parsing ? 'Lendo arquivo…' : 'Enviar DESIGN.md'}</div>
          <p className="pf-hint" style={{ marginTop: 4 }}>
            Extraímos cores, fonte e raio para você revisar antes de aplicar.
          </p>
        </div>

        {design ? (
          <div className="design-result">
            {design.title ? <div style={{ fontWeight: 700, marginBottom: 8 }}>{design.title}</div> : null}
            <div className="design-kv"><span className="k">Cor primária</span><span>{design.primaryColor ?? '—'}</span></div>
            <div className="design-kv"><span className="k">Cor secundária</span><span>{design.secondaryColor ?? '—'}</span></div>
            <div className="design-kv"><span className="k">Fonte</span><span>{design.fontFamily ?? '—'}</span></div>
            <div className="design-kv"><span className="k">Border radius</span><span>{design.borderRadius ?? '—'}</span></div>
            {design.palette.length > 0 ? (
              <div className="palette">
                {design.palette.slice(0, 10).map((c) => (
                  <span key={c} className="sw" style={{ background: c }} title={c} />
                ))}
              </div>
            ) : null}
            {design.warnings.length > 0 ? <div className="design-warn">{design.warnings.join(' ')}</div> : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--sp-4)' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={applyDesign}>Aplicar ao formulário</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDesign(null)}>Descartar</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="dn">Nome de exibição</label>
        <input id="dn" className="input" value={val('displayName', b.displayName ?? '')} onChange={(e) => set('displayName', e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pn">Nome do programa</label>
        <input id="pn" className="input" value={val('programName', b.programName)} onChange={(e) => set('programName', e.target.value)} />
      </div>
      <div className="grid grid-2">
        <ColorField id="pc" label="Cor primária" value={primary} onChange={(v) => set('primaryColor', v)} />
        <ColorField id="sc" label="Cor secundária" value={secondary} onChange={(v) => set('secondaryColor', v)} />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="ff">Fonte</label>
          <input id="ff" className="input" placeholder="Ex.: Poppins" value={val('fontFamily', b.fontFamily ?? '')} onChange={(e) => set('fontFamily', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="br">Border radius</label>
          <input id="br" className="input" placeholder="Ex.: 4px, 34px" value={val('borderRadius', b.borderRadius ?? '')} onChange={(e) => set('borderRadius', e.target.value)} />
        </div>
      </div>

      {/* Live preview */}
      <div className="brand-preview" aria-hidden>
        <span className="chip-prim" style={{ background: HEX.test(primary) ? primary : undefined }} />
        <span className="chip-sec" style={{ background: HEX.test(secondary) ? secondary : undefined }} />
        <span
          className="btn btn-primary btn-sm"
          style={{
            background: HEX.test(primary) ? primary : undefined,
            borderRadius: val('borderRadius', b.borderRadius ?? '') || undefined,
            fontFamily: val('fontFamily', b.fontFamily ?? '') || undefined,
          }}
        >
          {val('programName', b.programName) || 'Botão de exemplo'}
        </span>
      </div>

      <button className="btn btn-primary" type="submit" style={{ marginTop: 'var(--sp-4)' }}>
        Salvar branding
      </button>
    </form>
  );
}
