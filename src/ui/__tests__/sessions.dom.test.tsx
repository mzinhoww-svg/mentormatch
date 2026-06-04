import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SessionsView } from '../views/SessionsView.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

describe('SessionsView (proof 6: sessions appear & change status)', () => {
  it('lists a session and confirms it (status changes)', async () => {
    let status = 'requested';
    installFetch({
      'GET /api/mentorship/sessions': () => ({
        body: { sessions: [{ id: 's1', mentorshipId: 'ms1', scheduledAt: '2026-07-01T10:00:00.000Z', objective: 'Plano', status }] },
      }),
      'GET /api/mentorship/mentorships': { body: { mentorships: [{ id: 'ms1', status: 'active' }] } },
      'POST /api/mentorship/sessions/confirm': () => {
        status = 'confirmed';
        return { body: { ok: true } };
      },
    });
    render(<SessionsView />);

    expect(await screen.findByText('Solicitada')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(await screen.findByText('Confirmada')).toBeTruthy();
  });
});

describe('SessionsView (Slice 12: rate a completed session)', () => {
  it('shows 1-5 rating on completed sessions and posts session feedback', async () => {
    const mock = installFetch({
      'GET /api/mentorship/sessions': {
        body: { sessions: [{ id: 's9', mentorshipId: 'ms1', scheduledAt: '2026-07-01T10:00:00.000Z', objective: 'x', status: 'completed' }] },
      },
      'GET /api/mentorship/mentorships': { body: { mentorships: [] } },
      'POST /api/feedback/session': { status: 201, body: { ok: true, feedback: { id: 'f1', score: 5 } } },
    });
    render(<SessionsView />);
    await screen.findByText('Concluída');
    fireEvent.click(screen.getByRole('button', { name: 'Nota 5' }));
    await waitFor(() => expect(calledWith(mock, 'POST', '/api/feedback/session')).toBe(true));
    const call = mock.calls.find((c) => c.path === '/api/feedback/session');
    expect(call?.body).toMatchObject({ sessionId: 's9', score: 5 });
    expect(await screen.findByTestId('rated')).toBeTruthy();
  });
});

describe('SessionsView (create session)', () => {
  it('posts a new session', async () => {
    const mock = installFetch({
      'GET /api/mentorship/sessions': { body: { sessions: [] } },
      'GET /api/mentorship/mentorships': { body: { mentorships: [{ id: 'ms1', status: 'active' }] } },
      'POST /api/mentorship/sessions': { status: 201, body: { ok: true, session: { id: 's2' } } },
    });
    render(<SessionsView />);
    await screen.findByText('Agendar sessão');
    fireEvent.change(screen.getByLabelText('Mentoria'), { target: { value: 'ms1' } });
    fireEvent.change(screen.getByLabelText('Data/hora'), { target: { value: '2026-07-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /criar sessão/i }));
    await waitFor(() => expect(calledWith(mock, 'POST', '/api/mentorship/sessions')).toBe(true));
  });
});
