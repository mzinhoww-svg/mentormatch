'use client';
/**
 * Tenant custom-domain management (admin). Add a domain → publish the shown
 * DNS-TXT record → Verify. Only verified domains resolve to the tenant. Edge
 * routing + TLS (pointing the domain at the platform) is a separate ops step.
 */
import { useState, type FormEvent } from 'react';
import { api } from '../api.js';
import { Loading, Banner, useResource, errorMessage } from '../components.js';

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string | null;
}
interface AddResponse {
  domain: Domain;
  dns: { type: string; name: string; value: string };
}

export function CustomDomains() {
  const res = useResource<{ domains: Domain[] }>(() => api.get('/api/admin/domains'));
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [dns, setDns] = useState<AddResponse['dns'] | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setDns(null);
    setBusy(true);
    try {
      const r = await api.post<AddResponse>('/api/admin/domains', { domain: input });
      setDns(r.dns);
      setInput('');
      setMsg({ kind: 'ok', text: 'Domínio adicionado. Crie o registro TXT abaixo e clique em Verificar.' });
      res.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function verify(domain: string) {
    setMsg(null);
    try {
      await api.post('/api/admin/domains/verify', { domain });
      setMsg({ kind: 'ok', text: `Domínio ${domain} verificado.` });
      res.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  async function remove(domain: string) {
    setMsg(null);
    try {
      await api.del('/api/admin/domains', { domain });
      res.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err) });
    }
  }

  const domains = res.data?.domains ?? [];

  return (
    <section className="card" style={{ marginTop: 'var(--sp-4)' }}>
      <div className="card-h">Domínio personalizado (admin)</div>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <form onSubmit={add} style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
          <label htmlFor="cd">Adicionar domínio</label>
          <input
            id="cd"
            className="input"
            placeholder="mentoria.suaempresa.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Adicionando…' : 'Adicionar'}
        </button>
      </form>

      {dns ? (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <p className="muted" style={{ fontSize: 13 }}>Crie este registro DNS no seu provedor:</p>
          <pre
            className="mono"
            style={{
              fontSize: 12,
              background: 'var(--paper-2)',
              padding: 'var(--sp-3)',
              borderRadius: 'var(--r-sm)',
              overflowX: 'auto',
            }}
          >
            {`${dns.type}  ${dns.name}  ${dns.value}`}
          </pre>
        </div>
      ) : null}

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {res.loading ? (
          <Loading />
        ) : res.error ? (
          <Banner kind="error">{res.error}</Banner>
        ) : domains.length === 0 ? (
          <p className="muted">Nenhum domínio personalizado.</p>
        ) : (
          domains.map((d) => (
            <div className="row-item" key={d.id}>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{d.domain}</div>
              <span className={`tag ${d.verified ? 'tag-green' : 'tag-gray'}`}>
                {d.verified ? 'verificado' : 'pendente'}
              </span>
              {!d.verified ? (
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => verify(d.domain)}>
                  Verificar
                </button>
              ) : null}
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => remove(d.domain)}>
                Remover
              </button>
            </div>
          ))
        )}
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 'var(--sp-4)' }}>
        Após verificar, aponte o domínio para a plataforma (DNS) e habilite-o no edge para servir com SSL.
      </p>
    </section>
  );
}
