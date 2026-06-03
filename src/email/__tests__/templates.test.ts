import { describe, it, expect } from 'vitest';
import { renderTemplate, isEmailableEvent, EMAILABLE_TYPES, type TemplateContext } from '../templates.js';
import { ConsoleEmailProvider, NoopEmailProvider } from '../provider.js';

const ctx: TemplateContext = {
  recipientName: 'Camila',
  tenantName: 'Acme',
  appUrl: 'https://acme.mentorxmatch.xyz',
};

describe('email templates', () => {
  it('renders subject + body for every emailable type', () => {
    for (const type of EMAILABLE_TYPES) {
      const r = renderTemplate(type, ctx);
      expect(r).not.toBeNull();
      expect(r!.subject.length).toBeGreaterThan(0);
      expect(r!.body.length).toBeGreaterThan(0);
      expect(r!.templateKey).toBe(type);
    }
  });

  it('returns null for non-emailable events (no email is born)', () => {
    expect(renderTemplate('auth.login', ctx)).toBeNull();
    expect(renderTemplate('profile.updated', ctx)).toBeNull();
    expect(renderTemplate('not.a.real.event', ctx)).toBeNull();
    expect(isEmailableEvent('auth.login')).toBe(false);
    expect(isEmailableEvent('mentorship.requested')).toBe(true);
  });

  it('never embeds sensitive/contact data (uses whitelisted context only)', () => {
    // Even if a caller fabricated extra fields, the template ignores them.
    const dirty = { ...ctx, recipientName: 'Camila' } as TemplateContext & { contactEmail: string };
    dirty.contactEmail = 'secret-contact@x.com';
    const r = renderTemplate('mentorship.requested', dirty);
    expect(r!.body).not.toContain('secret-contact@x.com');
    expect(r!.body.toLowerCase()).not.toContain('contact');
  });
});

describe('email providers', () => {
  it('console provider succeeds', async () => {
    const r = await new ConsoleEmailProvider().send({
      to: 'a@b.com', subject: 's', body: 'b', templateKey: 'mentorship.requested', tenantId: 't', originEvent: 'mentorship.requested',
    });
    expect(r.ok).toBe(true);
  });
  it('noop provider succeeds without sending', async () => {
    const r = await new NoopEmailProvider().send();
    expect(r.ok).toBe(true);
  });
});
