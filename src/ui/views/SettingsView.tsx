'use client';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, PageHeader, useResource, errorMessage } from '../components.js';
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
      <PageHeader title="Configurações" subtitle="Preferências de notificação e personalização do programa." />

      <section className="card" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="card-h">Preferências de notificação</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 'var(--sp-4)' }}>
          Escolha como deseja ser avisado de cada evento.
        </p>
        {NOTIFICATION_TYPES.map((t) => {
          const p = prefMap.get(t);
          // Default ON for both channels (matches the server default).
          const inApp = p ? p.inApp : true;
          const email = p ? p.email : true;
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
          <LandingSettings />
          <CustomDomains />
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------ Landing (employee page) */

interface LandingTestimonial { quote: string; author: string; role: string }
interface LandingContent {
  niche: string | null;
  transformation: string | null;
  methodology: string | null;
  audience: string | null;
  testimonials: LandingTestimonial[];
}
interface SettingsWithLanding {
  settings: { landing: LandingContent };
}

const MAX_TESTIMONIALS = 4;

function LandingSettings() {
  const { data, loading, error } = useResource<SettingsWithLanding>(() => api.get('/api/admin/settings'));
  if (loading) return <Loading />;
  if (error || !data) return <Banner kind="error">{error ?? 'erro'}</Banner>;
  return <LandingForm initial={data.settings.landing} />;
}

function LandingForm({ initial }: { initial: LandingContent }) {
  const [niche, setNiche] = useState(initial.niche ?? '');
  const [transformation, setTransformation] = useState(initial.transformation ?? '');
  const [methodology, setMethodology] = useState(initial.methodology ?? '');
  const [audience, setAudience] = useState(initial.audience ?? '');
  const [items, setItems] = useState<(LandingTestimonial & { key: number })[]>(
    initial.testimonials.map((t, i) => ({ ...t, key: i })),
  );
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function setItem(key: number, patch: Partial<LandingTestimonial>) {
    setItems((list) => list.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }
  function addItem() {
    setItems((list) =>
      list.length >= MAX_TESTIMONIALS ? list : [...list, { quote: '', author: '', role: '', key: Date.now() }],
    );
  }
  function removeItem(key: number) {
    setItems((list) => list.filter((t) => t.key !== key));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await api.post('/api/admin/settings', {
        landing: {
          niche,
          transformation,
          methodology,
          audience,
          testimonials: items
            .filter((t) => t.quote.trim())
            .map((t) => ({ quote: t.quote, author: t.author, role: t.role })),
        },
      });
      setMsg({ kind: 'ok', text: 'Página do colaborador salva.' });
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" style={{ marginTop: 'var(--sp-4)' }} onSubmit={save}>
      <div className="card-h">Página do colaborador (landing)</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 'var(--sp-4)' }}>
        Personalize a página que o colaborador vê ao acessar o programa. Campos em branco usam um
        texto padrão.
      </p>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="field">
        <label htmlFor="lc-niche">Nicho / foco do programa</label>
        <input id="lc-niche" className="input" placeholder="Ex.: liderança técnica e gestão de times" value={niche} onChange={(e) => setNiche(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="lc-transformation">A grande transformação</label>
        <textarea id="lc-transformation" className="textarea" maxLength={600} placeholder="O que o colaborador alcança ao participar?" value={transformation} onChange={(e) => setTransformation(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="lc-method">Como funciona (método)</label>
        <textarea id="lc-method" className="textarea" maxLength={600} placeholder="Resumo do método, focado na facilidade de uso e acesso." value={methodology} onChange={(e) => setMethodology(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="lc-audience">Público-alvo interno</label>
        <input id="lc-audience" className="input" placeholder="Ex.: novos líderes e quem busca a próxima promoção" value={audience} onChange={(e) => setAudience(e.target.value)} />
      </div>

      <div className="card-h" style={{ marginTop: 'var(--sp-5)' }}>Depoimentos reais</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 'var(--sp-3)' }}>
        Substituem os exemplos genéricos. Até {MAX_TESTIMONIALS}.
      </p>
      {items.map((t) => (
        <div key={t.key} className="card" style={{ background: 'var(--paper-2)', marginBottom: 'var(--sp-3)' }}>
          <div className="field">
            <label htmlFor={`lc-q-${t.key}`}>Depoimento</label>
            <textarea id={`lc-q-${t.key}`} className="textarea" maxLength={400} value={t.quote} onChange={(e) => setItem(t.key, { quote: e.target.value })} />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor={`lc-a-${t.key}`}>Autor(a)</label>
              <input id={`lc-a-${t.key}`} className="input" placeholder="Ex.: Mariana L." value={t.author} onChange={(e) => setItem(t.key, { author: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor={`lc-r-${t.key}`}>Cargo / área</label>
              <input id={`lc-r-${t.key}`} className="input" placeholder="Ex.: Líder de Squad" value={t.role} onChange={(e) => setItem(t.key, { role: e.target.value })} />
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(t.key)}>Remover</button>
        </div>
      ))}
      {items.length < MAX_TESTIMONIALS ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>+ Adicionar depoimento</button>
      ) : null}

      <div>
        <button className="btn btn-primary" type="submit" style={{ marginTop: 'var(--sp-4)' }} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar página do colaborador'}
        </button>
      </div>
    </form>
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
