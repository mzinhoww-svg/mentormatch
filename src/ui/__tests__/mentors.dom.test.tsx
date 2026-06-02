import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MentorsView } from '../views/MentorsView.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

describe('MentorsView (proofs 4 & 5: directory cards/filters + request)', () => {
  it('renders filters and mentor cards, and requests mentorship', async () => {
    const mock = installFetch({
      'GET /api/mentors': {
        body: {
          items: [
            { tenantUserId: 'm1', displayName: 'Bruno Reis', title: 'Eng', area: 'Plataforma', seniority: 'Sr', bio: null, offeredSkills: ['React', 'Node'], available: true },
          ],
          total: 1,
        },
      },
      'POST /api/mentorship/requests': { status: 201, body: { ok: true, request: { id: 'r1' } } },
    });
    render(<MentorsView />);

    // Filter controls present.
    expect(screen.getByLabelText('Buscar')).toBeTruthy();
    expect(screen.getByLabelText('Área')).toBeTruthy();
    // Card rendered from the (host-scoped) response.
    expect(await screen.findByText('Bruno Reis')).toBeTruthy();
    expect(screen.getByText('React')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /solicitar mentoria/i }));
    await waitFor(() => expect(calledWith(mock, 'POST', '/api/mentorship/requests')).toBe(true));
    const req = mock.calls.find((c) => c.path === '/api/mentorship/requests');
    expect(req?.body).toMatchObject({ mentorId: 'm1' });
  });
});
