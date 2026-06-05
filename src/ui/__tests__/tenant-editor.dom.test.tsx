import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { TenantEditor } from '../views/TenantEditor.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

const SETTINGS = {
  settings: {
    branding: {
      displayName: 'Sicredi',
      logoUrl: null,
      primaryColor: '#2F8F2F',
      secondaryColor: '#1E6B1E',
      programName: 'Programa de Mentoria',
      fontFamily: null,
      borderRadius: null,
      locale: 'pt-BR',
    },
    status: 'active',
    allowSelfSignup: true,
    defaultMentorCapacity: 3,
  },
};
const OVERVIEW = {
  overview: {
    users: { active: 8 },
    mentors: { active: 2, available: 1 },
    mentees: { active: 5 },
    mentorships: { active: 3 },
    sessions: { total: 6 },
    capacity: { total: 6, used: 3, waitlisted: 1 },
    participationRate: 0.5,
  },
};

describe('TenantEditor (console per-tenant panel)', () => {
  it('shows stats and the expanded config fields', async () => {
    installFetch({
      'GET /api/platform/tenants/settings': { body: SETTINGS },
      'GET /api/platform/tenants/overview': { body: OVERVIEW },
    });
    render(<TenantEditor tenantId="t1" tenantName="Sicredi" />);

    // Stats render.
    expect(await screen.findByText('Usuários')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy(); // participation
    // New config fields render.
    expect(screen.getByLabelText('Fonte (Google Font)')).toBeTruthy();
    expect(screen.getByLabelText('Border radius')).toBeTruthy();
    expect(screen.getByLabelText('Capacidade padrão por mentor')).toBeTruthy();
    expect(screen.getByText(/auto.cadastro/i)).toBeTruthy();
  });

  it('saves the touched fields with the right types', async () => {
    const mock = installFetch({
      'GET /api/platform/tenants/settings': { body: SETTINGS },
      'GET /api/platform/tenants/overview': { body: OVERVIEW },
      'POST /api/platform/tenants/settings': { body: { ok: true, settings: SETTINGS.settings } },
    });
    render(<TenantEditor tenantId="t1" tenantName="Sicredi" />);

    fireEvent.change(await screen.findByLabelText('Fonte (Google Font)'), { target: { value: 'Poppins' } });
    fireEvent.change(screen.getByLabelText('Border radius'), { target: { value: '4px' } });
    fireEvent.change(screen.getByLabelText('Capacidade padrão por mentor'), { target: { value: '5' } });
    fireEvent.click(screen.getByLabelText(/auto.cadastro/i)); // toggle off (was true)
    fireEvent.click(screen.getByRole('button', { name: /salvar configurações/i }));

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/platform/tenants/settings')).toBe(true));
    const call = mock.calls.find((c) => c.method === 'POST' && c.path === '/api/platform/tenants/settings');
    expect(call?.body).toMatchObject({
      tenantId: 't1',
      fontFamily: 'Poppins',
      borderRadius: '4px',
      defaultMentorCapacity: 5, // number, not string
      allowSelfSignup: false, // boolean, toggled off
    });
  });
});
