/**
 * Demo-request validation (pure). The marketing form registers commercial
 * interest; this validates input before it is recorded. No product/tenant
 * coupling, no CRM dependency.
 */
import { HEADCOUNT_OPTIONS } from './content.js';

export interface DemoRequestInput {
  name?: unknown;
  company?: unknown;
  role?: unknown;
  email?: unknown;
  headcount?: unknown;
}

export interface DemoRequest {
  name: string;
  company: string;
  role: string;
  email: string;
  headcount: string;
}

export type DemoValidation =
  | { ok: true; value: DemoRequest }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function validateDemoRequest(input: DemoRequestInput): DemoValidation {
  const name = str(input.name);
  const company = str(input.company);
  const role = str(input.role);
  const email = str(input.email);
  const headcount = str(input.headcount);

  if (!name) return { ok: false, error: 'name_required' };
  if (!company) return { ok: false, error: 'company_required' };
  if (!role) return { ok: false, error: 'role_required' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'invalid_email' };
  if (!(HEADCOUNT_OPTIONS as readonly string[]).includes(headcount)) {
    return { ok: false, error: 'invalid_headcount' };
  }
  return { ok: true, value: { name, company, role, email, headcount } };
}
