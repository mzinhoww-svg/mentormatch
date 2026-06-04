/**
 * Tenant settings & branding foundation. One row per tenant, tenant-scoped via
 * withTenant (RLS). When no row exists, safe brand-kit defaults are returned so
 * the white-label contract never breaks. Branding is admin-managed and audited.
 * No ContactInfo is involved; one tenant's settings can never affect another.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordSettingsEvent } from './audit.js';
import {
  resolveBranding,
  isValidHexColor,
  isSupportedLocale,
  isValidRadius,
  type ResolvedBranding,
} from './branding.js';

export type TenantStatus = 'active' | 'inactive';

export interface TenantSettings {
  branding: ResolvedBranding;
  status: TenantStatus;
  allowSelfSignup: boolean;
  defaultMentorCapacity: number;
  /** True when an explicit settings row exists (vs. pure defaults). */
  customized: boolean;
}

interface SettingsRow {
  display_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  border_radius: string | null;
  program_name: string | null;
  locale: string | null;
  status: TenantStatus;
  allow_self_signup: boolean;
  default_mentor_capacity: number;
}

function toSettings(row: SettingsRow | undefined): TenantSettings {
  const branding = resolveBranding(
    row
      ? {
          displayName: row.display_name,
          logoUrl: row.logo_url,
          primaryColor: row.primary_color,
          secondaryColor: row.secondary_color,
          fontFamily: row.font_family,
          borderRadius: row.border_radius,
          programName: row.program_name,
          locale: row.locale,
        }
      : null,
  );
  return {
    branding,
    status: row?.status ?? 'active',
    allowSelfSignup: row?.allow_self_signup ?? true,
    defaultMentorCapacity: row?.default_mentor_capacity ?? 3,
    customized: Boolean(row),
  };
}

const SELECT_ROW = `
  display_name, logo_url, primary_color, secondary_color, font_family, border_radius,
  program_name, locale, status, allow_self_signup, default_mentor_capacity`;

/** Returns the tenant's fully-resolved settings (brand-kit defaults if no row). */
export async function getSettings(tenantId: string): Promise<TenantSettings> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<SettingsRow>(
      `SELECT ${SELECT_ROW} FROM tenant_settings WHERE tenant_id = $1`,
      [tenantId],
    );
    return toSettings(res.rows[0]);
  });
}

/**
 * Public-safe branding only (for white-label theming, e.g. the login page).
 * Never exposes operational settings or any sensitive data.
 */
export async function getPublicBranding(tenantId: string): Promise<ResolvedBranding> {
  return (await getSettings(tenantId)).branding;
}

export interface UpdateSettingsInput {
  displayName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  fontFamily?: string | null;
  borderRadius?: string | null;
  programName?: string | null;
  locale?: string;
  allowSelfSignup?: boolean;
  defaultMentorCapacity?: number;
}

function validate(input: UpdateSettingsInput): void {
  for (const c of [input.primaryColor, input.secondaryColor]) {
    if (c !== undefined && c !== null && !isValidHexColor(c)) {
      throw expectedError(ErrorCode.VALIDATION, 'invalid_color');
    }
  }
  if (input.borderRadius !== undefined && input.borderRadius !== null && !isValidRadius(input.borderRadius)) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_radius');
  }
  if (input.locale !== undefined && !isSupportedLocale(input.locale)) {
    throw expectedError(ErrorCode.VALIDATION, 'unsupported_locale');
  }
  if (
    input.defaultMentorCapacity !== undefined &&
    (!Number.isInteger(input.defaultMentorCapacity) || input.defaultMentorCapacity < 0)
  ) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_capacity');
  }
}

/** Upserts tenant settings/branding (admin). Validates colors/locale/capacity. */
export async function updateSettings(
  tenantId: string,
  adminId: string,
  input: UpdateSettingsInput,
): Promise<TenantSettings> {
  validate(input);

  const settings = await withTenant(tenantId, async (db) => {
    const res = await db.query<SettingsRow>(
      `INSERT INTO tenant_settings
         (tenant_id, display_name, logo_url, primary_color, secondary_color,
          font_family, border_radius, program_name, locale, allow_self_signup, default_mentor_capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9,'pt-BR'), COALESCE($10,true), COALESCE($11,3))
       ON CONFLICT (tenant_id) DO UPDATE SET
         display_name = COALESCE($2, tenant_settings.display_name),
         logo_url = COALESCE($3, tenant_settings.logo_url),
         primary_color = COALESCE($4, tenant_settings.primary_color),
         secondary_color = COALESCE($5, tenant_settings.secondary_color),
         font_family = COALESCE($6, tenant_settings.font_family),
         border_radius = COALESCE($7, tenant_settings.border_radius),
         program_name = COALESCE($8, tenant_settings.program_name),
         locale = COALESCE($9, tenant_settings.locale),
         allow_self_signup = COALESCE($10, tenant_settings.allow_self_signup),
         default_mentor_capacity = COALESCE($11, tenant_settings.default_mentor_capacity),
         updated_at = now()
       RETURNING ${SELECT_ROW}`,
      [
        tenantId,
        input.displayName ?? null,
        input.logoUrl ?? null,
        input.primaryColor ?? null,
        input.secondaryColor ?? null,
        input.fontFamily ?? null,
        input.borderRadius ?? null,
        input.programName ?? null,
        input.locale ?? null,
        input.allowSelfSignup ?? null,
        input.defaultMentorCapacity ?? null,
      ],
    );
    return toSettings(res.rows[0]);
  });

  await recordSettingsEvent(tenantId, 'settings.updated', {
    actorId: adminId,
    metadata: {
      brandingChanged: Boolean(
        input.logoUrl || input.primaryColor || input.secondaryColor || input.displayName,
      ),
    },
  });
  return settings;
}

/**
 * Sets (or clears, with null) the tenant logo URL. Unlike updateSettings this
 * can clear the value — updateSettings COALESCEs a null logoUrl to keep the
 * prior value. Audited as a branding change.
 */
export async function setTenantLogo(
  tenantId: string,
  adminId: string,
  logoUrl: string | null,
): Promise<TenantSettings> {
  const settings = await withTenant(tenantId, async (db) => {
    const res = await db.query<SettingsRow>(
      `INSERT INTO tenant_settings (tenant_id, logo_url)
       VALUES ($1, $2)
       ON CONFLICT (tenant_id) DO UPDATE SET logo_url = $2, updated_at = now()
       RETURNING ${SELECT_ROW}`,
      [tenantId, logoUrl],
    );
    return toSettings(res.rows[0]);
  });
  await recordSettingsEvent(tenantId, 'settings.updated', {
    actorId: adminId,
    metadata: { brandingChanged: true, logoChanged: true },
  });
  return settings;
}

/** Sets the tenant's operational status (active/inactive). Audited. */
export async function setTenantStatus(
  tenantId: string,
  adminId: string,
  status: TenantStatus,
): Promise<void> {
  if (status !== 'active' && status !== 'inactive') {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_status');
  }
  await withTenant(tenantId, (db) =>
    db.query(
      `INSERT INTO tenant_settings (tenant_id, status)
       VALUES ($1, $2)
       ON CONFLICT (tenant_id) DO UPDATE SET status = $2, updated_at = now()`,
      [tenantId, status],
    ),
  );
  await recordSettingsEvent(tenantId, 'settings.status_changed', {
    actorId: adminId,
    metadata: { status },
  });
}
