import { json } from '../../../auth/http.js';
import {
  getBaseDomain,
  getTenantDomainMode,
  resolveTenantFromHost,
} from '../../../tenancy/resolveTenant.js';
import { resolveActiveTenant } from '../../../tenancy/admin.js';
import { ownerPool } from '../../../tenancy/pool.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Production diagnostics (no secrets). Reveals how the current host resolves and
 * whether the DB is reachable — so misconfig (APP_BASE_DOMAIN, SSL, missing
 * AUTH_SECRET, wrong DB) is visible in one request. Returns booleans/codes only;
 * never connection strings, tenant data, or secret values.
 */
export async function GET(request: Request): Promise<Response> {
  const host = request.headers.get('host');

  // DB connectivity probe (owner pool — registry).
  let db: { ok: boolean; error?: string } = { ok: false };
  try {
    await ownerPool().query('SELECT 1');
    db = { ok: true };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    db = { ok: false, error: (e.code || e.message || 'error').toString().slice(0, 120) };
  }

  // Host classification (pure) + DB-confirmed tenant resolution.
  const structural = resolveTenantFromHost(host);
  let tenantFound = false;
  let resolveError: string | undefined;
  try {
    const active = await resolveActiveTenant(host);
    tenantFound = active.kind === 'TENANT';
  } catch (err) {
    const e = err as { message?: string };
    resolveError = (e.message || 'error').toString().slice(0, 120);
  }

  return json({
    host,
    baseDomain: getBaseDomain(),
    tenantDomainMode: getTenantDomainMode(),
    hostResolution: structural.kind,
    slug: structural.kind === 'TENANT' ? structural.slug : null,
    tenantFound,
    resolveError: resolveError ?? null,
    db,
    env: {
      APP_BASE_DOMAIN: Boolean(process.env.APP_BASE_DOMAIN),
      AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      DIRECT_URL: Boolean(process.env.DIRECT_URL),
    },
  });
}
