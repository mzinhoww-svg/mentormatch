import { describe, it, expect } from 'vitest';
import {
  buildSetPasswordEmail,
  sendSetPasswordEmail,
  buildResetPasswordEmail,
  sendResetPasswordEmail,
  SET_PASSWORD_TEMPLATE_KEY,
  SET_PASSWORD_ORIGIN_EVENT,
  RESET_PASSWORD_TEMPLATE_KEY,
  type SetPasswordEmailContext,
} from '../transactional.js';
import type { EmailProvider, OutgoingEmail, SendResult } from '../provider.js';

const baseCtx: SetPasswordEmailContext = {
  to: 'ana@acme.com',
  recipientName: 'Ana Admin',
  tenantName: 'Acme Inc',
  setPasswordUrl: 'https://acme.example.com/set-password?token=abc.def',
  validDays: 7,
};

describe('buildSetPasswordEmail', () => {
  it('renders subject + body with the tenant, link and validity', () => {
    const { subject, body, templateKey } = buildSetPasswordEmail(baseCtx);
    expect(subject).toContain('Acme Inc');
    expect(body).toContain('Ana Admin');
    expect(body).toContain(baseCtx.setPasswordUrl);
    expect(body).toContain('7 dias');
    expect(templateKey).toBe(SET_PASSWORD_TEMPLATE_KEY);
  });

  it('falls back to a neutral greeting without a name', () => {
    const { body } = buildSetPasswordEmail({ ...baseCtx, recipientName: null });
    expect(body.startsWith('Olá.')).toBe(true);
    expect(body).not.toContain('Olá, ');
  });
});

describe('sendSetPasswordEmail', () => {
  it('sends through the provider with the expected envelope and returns its result', async () => {
    const calls: OutgoingEmail[] = [];
    const provider: EmailProvider = {
      name: 'fake',
      async send(e) {
        calls.push(e);
        return { ok: true, providerMessageId: 'fake-1' };
      },
    };
    const res = await sendSetPasswordEmail(baseCtx, 'tenant-123', provider);
    expect(res).toEqual({ ok: true, providerMessageId: 'fake-1' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      to: baseCtx.to,
      tenantId: 'tenant-123',
      templateKey: SET_PASSWORD_TEMPLATE_KEY,
      originEvent: SET_PASSWORD_ORIGIN_EVENT,
    });
    expect(calls[0]!.body).toContain(baseCtx.setPasswordUrl);
  });

  it('never throws — a throwing provider becomes { ok: false }', async () => {
    const provider: EmailProvider = {
      name: 'boom',
      send(): Promise<SendResult> {
        throw new Error('smtp down');
      },
    };
    const res = await sendSetPasswordEmail(baseCtx, 't1', provider);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('smtp down');
  });
});

describe('buildResetPasswordEmail', () => {
  it('renders a reset subject + body with the tenant and link', () => {
    const { subject, body, templateKey } = buildResetPasswordEmail(baseCtx);
    expect(subject).toContain('Redefinir');
    expect(subject).toContain('Acme Inc');
    expect(body).toContain('Ana Admin');
    expect(body).toContain(baseCtx.setPasswordUrl);
    // Reset tokens are short-lived; the copy says ~1h regardless of validDays.
    expect(body).toContain('1 hora');
    expect(templateKey).toBe(RESET_PASSWORD_TEMPLATE_KEY);
  });

  it('reassures the user when it was not them', () => {
    const { body } = buildResetPasswordEmail(baseCtx);
    expect(body).toContain('Se não foi você');
  });
});

describe('sendResetPasswordEmail', () => {
  it('sends through the provider with the reset envelope', async () => {
    const calls: OutgoingEmail[] = [];
    const provider: EmailProvider = {
      name: 'fake',
      async send(e) {
        calls.push(e);
        return { ok: true, providerMessageId: 'reset-1' };
      },
    };
    const res = await sendResetPasswordEmail(baseCtx, 'tenant-9', provider);
    expect(res).toEqual({ ok: true, providerMessageId: 'reset-1' });
    expect(calls[0]).toMatchObject({
      to: baseCtx.to,
      tenantId: 'tenant-9',
      templateKey: RESET_PASSWORD_TEMPLATE_KEY,
      originEvent: 'auth.password_reset_requested',
    });
  });

  it('never throws — a throwing provider becomes { ok: false }', async () => {
    const provider: EmailProvider = {
      name: 'boom',
      send(): Promise<SendResult> {
        throw new Error('relay refused');
      },
    };
    const res = await sendResetPasswordEmail(baseCtx, 't1', provider);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('relay refused');
  });
});
