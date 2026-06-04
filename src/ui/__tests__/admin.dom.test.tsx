import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AdminView } from '../views/AdminView.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

const OVERVIEW = {
  overview: {
    users: { active: 1 },
    mentors: { active: 0, available: 0 },
    mentees: { active: 0 },
    mentorships: { active: 0 },
    sessions: { total: 0, byStatus: {} },
    requests: { byStatus: {} },
    capacity: { total: 0, used: 0, waitlisted: 0 },
    participationRate: 0,
  },
};

describe('AdminView (proofs 8 & 10: tenant-scoped metrics)', () => {
  it('renders the metrics returned for the current tenant host', async () => {
    installFetch({
      'GET /api/admin/overview': {
        body: {
          overview: {
            users: { active: 42 },
            mentors: { active: 7, available: 9 },
            mentees: { active: 30 },
            mentorships: { active: 12 },
            sessions: { total: 18, byStatus: { requested: 2, confirmed: 5, completed: 10, cancelled: 1 } },
            requests: { byStatus: {} },
            capacity: { total: 20, used: 12, waitlisted: 3 },
            participationRate: 0.5,
          },
        },
      },
      'GET /api/admin/users': {
        body: { users: [{ id: 'u1', displayName: 'Marina Alves', email: 'm@x.com', role: 'admin', status: 'active', profileStatus: 'active' }] },
      },
    });
    render(<AdminView />);

    const metrics = await screen.findByTestId('admin-metrics');
    // Numbers come straight from this tenant's API response (tenant-scoped).
    expect(metrics.textContent).toContain('42');
    expect(metrics.textContent).toContain('12');
    expect(metrics.textContent).toContain('50%');
    // User list (tenant-scoped) rendered.
    expect(await screen.findByText('Marina Alves')).toBeTruthy();
    // Account status shows a PT label (not the raw "active").
    expect(screen.getByText('Ativa')).toBeTruthy();
    // Suspending opens a confirmation dialog before acting.
    fireEvent.click(screen.getByRole('button', { name: 'Suspender' }));
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
  });
});

describe('AdminView — invite member', () => {
  it('posts the invite (email + role) and confirms it was sent by email', async () => {
    const mock = installFetch({
      'GET /api/admin/overview': { body: OVERVIEW },
      'GET /api/admin/users': { body: { users: [] } },
      'POST /api/admin/members': {
        status: 201,
        body: { ok: true, emailSent: true, setPasswordUrl: 'https://acme.test/set-password?token=x', role: 'program_manager' },
      },
    });
    render(<AdminView />);

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'novo@acme.test' } });
    fireEvent.change(screen.getByLabelText('Nome (opcional)'), { target: { value: 'Novo Membro' } });
    fireEvent.change(screen.getByLabelText('Papel'), { target: { value: 'program_manager' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/admin/members')).toBe(true));
    const call = mock.calls.find((c) => c.path === '/api/admin/members');
    expect(call?.body).toMatchObject({ email: 'novo@acme.test', displayName: 'Novo Membro', role: 'program_manager' });
    // Success confirmation is shown to the admin.
    expect(await screen.findByText(/Convite enviado por e-mail/)).toBeTruthy();
  });

  it('shows the link to share when email delivery is not configured', async () => {
    installFetch({
      'GET /api/admin/overview': { body: OVERVIEW },
      'GET /api/admin/users': { body: { users: [] } },
      'POST /api/admin/members': {
        status: 201,
        body: { ok: true, emailSent: false, setPasswordUrl: 'https://acme.test/set-password?token=abc123', role: 'member' },
      },
    });
    render(<AdminView />);

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'sem-email@acme.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(await screen.findByText(/compartilhe o link/)).toBeTruthy();
    expect(screen.getByText('https://acme.test/set-password?token=abc123')).toBeTruthy();
  });
});
