import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { NotificationsView } from '../views/NotificationsView.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

describe('NotificationsView (proof 7: list, counter & mark read)', () => {
  it('shows unread count, lists notifications and marks one read', async () => {
    let read = false;
    const mock = installFetch({
      'GET /api/notifications': () => ({
        body: {
          notifications: [{ id: 'n1', type: 'mentorship.requested', status: read ? 'read' : 'unread', createdAt: '2026-06-02T00:00:00.000Z' }],
          unread: read ? 0 : 1,
        },
      }),
      'POST /api/notifications/read': () => {
        read = true;
        return { body: { ok: true } };
      },
    });
    render(<NotificationsView />);

    expect((await screen.findByTestId('unread-count')).textContent).toBe('1');
    expect(screen.getByText('Nova solicitação de mentoria')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /marcar lida/i }));
    await waitFor(() => expect(calledWith(mock, 'POST', '/api/notifications/read')).toBe(true));
    // After reload the unread counter is gone.
    await waitFor(() => expect(screen.queryByTestId('unread-count')).toBeNull());
  });
});
