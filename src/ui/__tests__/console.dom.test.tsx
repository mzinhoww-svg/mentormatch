import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { PlatformConsole } from '../views/PlatformConsole.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

const TENANTS = {
  tenants: [
    { id: 't1', slug: 'acme', name: 'Acme', status: 'active', createdAt: '2026-01-01T00:00:00Z', usage: { users: 3, mentorships: 1, sessions: 2 } },
  ],
};
const ADMINS = {
  admins: [
    { id: 'me', email: 'me@x.com', displayName: 'Me', status: 'active' },
    { id: 'other', email: 'other@x.com', displayName: null, status: 'active' },
  ],
};

describe('PlatformConsole — Batch 2 sections', () => {
  it('shows per-tenant usage counts', async () => {
    installFetch({
      'GET /api/platform/tenants': { body: TENANTS },
      'GET /api/platform/admins': { body: ADMINS },
    });
    render(<PlatformConsole adminEmail="me@x.com" adminId="me" />);
    expect(await screen.findByText('3u · 1m · 2s')).toBeTruthy();
  });

  it('lists platform admins, marks self, and only offers to suspend others', async () => {
    installFetch({
      'GET /api/platform/tenants': { body: TENANTS },
      'GET /api/platform/admins': { body: ADMINS },
    });
    render(<PlatformConsole adminEmail="me@x.com" adminId="me" />);

    const heading = await screen.findByText(/Administradores da plataforma/);
    const section = heading.closest('section') as HTMLElement;
    expect(within(section).getByText(/me@x\.com \(você\)/)).toBeTruthy();
    // other@x.com has no display name, so it appears as both the name and the email.
    expect(within(section).getAllByText('other@x.com').length).toBeGreaterThan(0);
    // One suspend button within this section (the other admin — never self).
    expect(within(section).getAllByRole('button', { name: 'Suspender' })).toHaveLength(1);
  });

  it('adds a platform admin with an initial password', async () => {
    const mock = installFetch({
      'GET /api/platform/tenants': { body: TENANTS },
      'GET /api/platform/admins': { body: ADMINS },
      'POST /api/platform/admins': { status: 201, body: { ok: true, admin: { id: 'n', email: 'new@x.com', displayName: null, status: 'active' } } },
    });
    render(<PlatformConsole adminEmail="me@x.com" adminId="me" />);

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'new@x.com' } });
    fireEvent.change(screen.getByLabelText('Senha inicial'), { target: { value: 'pw12345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar admin' }));

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/platform/admins')).toBe(true));
    const call = mock.calls.find((c) => c.method === 'POST' && c.path === '/api/platform/admins');
    expect(call?.body).toMatchObject({ email: 'new@x.com', password: 'pw12345678' });
    expect(await screen.findByText('Admin adicionado.')).toBeTruthy();
  });

  it('does not submit a too-short initial password (minLength guards the API)', async () => {
    const mock = installFetch({
      'GET /api/platform/tenants': { body: TENANTS },
      'GET /api/platform/admins': { body: ADMINS },
    });
    render(<PlatformConsole adminEmail="me@x.com" adminId="me" />);

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'new@x.com' } });
    const pw = screen.getByLabelText('Senha inicial');
    fireEvent.change(pw, { target: { value: 'short' } });
    expect(pw.getAttribute('minLength')).toBe('8');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar admin' }));

    // A weak password never reaches the API (native minLength + the JS backstop).
    expect(calledWith(mock, 'POST', '/api/platform/admins')).toBe(false);
  });
});
