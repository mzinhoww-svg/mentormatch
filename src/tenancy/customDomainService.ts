/**
 * Tenant custom-domain registry service (Phase 5). Domains live in the
 * tenant_domain REGISTRY (no RLS — see migration 0013), so all writes go through
 * the owner role (ownerPool). A domain only ever resolves to its tenant once
 * DNS-TXT verified; verification proves control of the domain (anti-hijacking).
 *
 * This service covers the self-contained core (storage + DNS verification).
 * Registering the verified domain with the edge (Vercel) for routing + TLS is a
 * separate concern handled by a domain provider, wired with a Vercel API token.
 */
import { randomBytes } from 'node:crypto';
import { promises as dnsp } from 'node:dns';
import { ownerPool } from './pool.js';
import { getBaseDomain } from './resolveTenant.js';
import {
  normalizeDomain,
  isValidCustomDomain,
  verifyRecordName,
  verifyRecordValue,
} from './customDomain.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { logger } from '../observability/logger.js';
import { addDomainToEdge, verifyDomainOnEdge } from './vercelDomains.js';
import { clearTenantResolutionCache } from './admin.js';

export interface CustomDomain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

interface DomainRow {
  id: string;
  domain: string;
  verified: boolean;
  verification_token: string | null;
  verified_at: Date | null;
  created_at: Date;
}

const SELECT = 'id, domain, verified, verification_token, verified_at, created_at';

function toDomain(r: DomainRow): CustomDomain {
  return {
    id: r.id,
    domain: r.domain,
    verified: r.verified,
    verificationToken: r.verification_token,
    verifiedAt: r.verified_at ? r.verified_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  };
}

/** Validates format and rejects the platform's own domain family. */
function assertCustomDomain(raw: string): string {
  const d = normalizeDomain(raw);
  if (!isValidCustomDomain(d)) throw expectedError(ErrorCode.VALIDATION, 'invalid_domain');
  const base = getBaseDomain();
  if (d === base || d.endsWith(`.${base}`)) {
    throw expectedError(ErrorCode.VALIDATION, 'reserved_domain');
  }
  return d;
}

/** Lists a tenant's custom domains (newest first). */
export async function listCustomDomains(tenantId: string): Promise<CustomDomain[]> {
  const res = await ownerPool().query<DomainRow>(
    `SELECT ${SELECT} FROM tenant_domain WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId],
  );
  return res.rows.map(toDomain);
}

/**
 * Adds (or re-issues the token for) a custom domain for a tenant. A domain owned
 * by ANOTHER tenant can never be claimed (domain_taken); re-adding your own
 * resets the token and clears verification.
 */
export async function addCustomDomain(tenantId: string, domain: string): Promise<CustomDomain> {
  const d = assertCustomDomain(domain);
  const token = randomBytes(16).toString('hex');
  const existing = (
    await ownerPool().query<DomainRow & { tenant_id: string }>(
      `SELECT ${SELECT}, tenant_id FROM tenant_domain WHERE domain = $1`,
      [d],
    )
  ).rows[0];

  let result: CustomDomain;
  if (existing) {
    if (existing.tenant_id !== tenantId) throw expectedError(ErrorCode.CONFLICT, 'domain_taken');
    const updated = (
      await ownerPool().query<DomainRow>(
        `UPDATE tenant_domain SET verification_token = $2, verified = false, verified_at = NULL
         WHERE id = $1 RETURNING ${SELECT}`,
        [existing.id, token],
      )
    ).rows[0]!;
    result = toDomain(updated);
  } else {
    const inserted = (
      await ownerPool().query<DomainRow>(
        `INSERT INTO tenant_domain (tenant_id, domain, verification_token, verified)
         VALUES ($1, $2, $3, false) RETURNING ${SELECT}`,
        [tenantId, d, token],
      )
    ).rows[0]!;
    logger.info('custom_domain.added', { tenantId, domain: d });
    result = toDomain(inserted);
  }

  // Best-effort: register with the edge (Vercel) so it routes + issues TLS once
  // DNS points. No-op when unconfigured; never blocks the local flow.
  const edge = await addDomainToEdge(d);
  if (!edge.ok && !edge.skipped) {
    logger.warn('custom_domain.edge_register_failed', { tenantId, domain: d, error: edge.error });
  }
  // Re-adding un-verifies the domain (verified=false), which changes resolution.
  clearTenantResolutionCache();
  return result;
}

export type TxtResolver = (hostname: string) => Promise<string[][]>;
const defaultResolver: TxtResolver = (h) => dnsp.resolveTxt(h);

/**
 * Verifies a tenant's custom domain by checking its DNS-TXT record matches the
 * issued token. On success the domain becomes resolvable. The TXT resolver is
 * injectable for tests. Never trusts an unverified domain.
 */
export async function verifyCustomDomain(
  tenantId: string,
  domain: string,
  resolveTxt: TxtResolver = defaultResolver,
): Promise<CustomDomain> {
  const d = normalizeDomain(domain);
  const row = (
    await ownerPool().query<DomainRow>(
      `SELECT ${SELECT} FROM tenant_domain WHERE tenant_id = $1 AND domain = $2`,
      [tenantId, d],
    )
  ).rows[0];
  if (!row || !row.verification_token) throw expectedError(ErrorCode.VALIDATION, 'domain_not_found');

  let records: string[][] = [];
  try {
    records = await resolveTxt(verifyRecordName(d));
  } catch {
    records = []; // NXDOMAIN / no records → treated as not-yet-verified
  }
  const expected = verifyRecordValue(row.verification_token);
  const ok = records.some((chunks) => chunks.join('').trim() === expected);
  if (!ok) throw expectedError(ErrorCode.VALIDATION, 'verification_failed');

  const updated = (
    await ownerPool().query<DomainRow>(
      `UPDATE tenant_domain SET verified = true, verified_at = now() WHERE id = $1 RETURNING ${SELECT}`,
      [row.id],
    )
  ).rows[0]!;
  logger.info('custom_domain.verified', { tenantId, domain: d });
  // A newly-verified domain now resolves — drop any cached NO_TENANT for it.
  clearTenantResolutionCache();

  // Best-effort: ask the edge (Vercel) to (re)check its own challenge too.
  const edge = await verifyDomainOnEdge(d);
  if (!edge.ok && !edge.skipped) {
    logger.warn('custom_domain.edge_verify_failed', { tenantId, domain: d, error: edge.error });
  }
  return toDomain(updated);
}

/** Removes a custom domain owned by the tenant. */
export async function removeCustomDomain(tenantId: string, domain: string): Promise<void> {
  await ownerPool().query('DELETE FROM tenant_domain WHERE tenant_id = $1 AND domain = $2', [
    tenantId,
    normalizeDomain(domain),
  ]);
  // A removed domain must stop resolving immediately.
  clearTenantResolutionCache();
}
