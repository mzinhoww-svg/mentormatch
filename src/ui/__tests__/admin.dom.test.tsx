import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AdminView } from '../views/AdminView.js';
import { installFetch } from './fetchMock.js';

afterEach(cleanup);

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
