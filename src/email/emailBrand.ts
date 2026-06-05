/**
 * Email brand tokens — the minimal branding an email needs (name, logo, accent
 * + readable text on it). Derived from a tenant's ResolvedBranding, with the
 * MentorMatch brand kit as the fallback so every email is branded even when a
 * tenant has no customization.
 */
import { type ResolvedBranding } from '../settings/branding.js';
import { readableTextOn } from '../ui/branding.js';

export interface EmailBrand {
  tenantName: string;
  logoUrl: string | null;
  primaryColor: string;
  /** Readable text color ON the primary color (white or ink). */
  onPrimary: string;
  programName: string;
}

export const DEFAULT_EMAIL_BRAND: EmailBrand = {
  tenantName: 'MentorMatch',
  logoUrl: null,
  primaryColor: '#FF4A1C',
  onPrimary: '#FFFFFF',
  programName: 'Programa de Mentoria',
};

/** Builds email brand tokens from a tenant's resolved branding. */
export function emailBrandFromBranding(b: ResolvedBranding, fallbackName?: string): EmailBrand {
  return {
    tenantName: b.displayName ?? fallbackName ?? b.programName ?? DEFAULT_EMAIL_BRAND.tenantName,
    logoUrl: b.logoUrl,
    primaryColor: b.primaryColor,
    onPrimary: readableTextOn(b.primaryColor),
    programName: b.programName,
  };
}
