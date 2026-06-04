import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { AppShell } from '../AppShell.js';
import { installFetch } from './fetchMock.js';
import type { Branding } from '../branding.js';

afterEach(cleanup);

const BRANDING: Branding = {
  displayName: 'Acme',
  logoUrl: null,
  primaryColor: '#FF4A1C',
  secondaryColor: '#1B5C4C',
  inkColor: '#14100D',
  paperColor: '#FBF7F0',
  programName: 'Mentoria Acme',
  locale: 'pt-BR',
  fontFamily: null,
  borderRadius: null,
};

describe('AppShell — notification bell', () => {
  it('shows the unread count from the API on a bell that links to notifications', async () => {
    installFetch({ 'GET /api/notifications': { body: { notifications: [], unread: 5 } } });
    render(
      <AppShell role="member" displayName="Ana" branding={BRANDING}>
        <div>conteúdo</div>
      </AppShell>,
    );

    const bell = await screen.findByLabelText(/Notificações/);
    expect(bell.getAttribute('href')).toBe('/app/notifications');
    expect(await screen.findByText('5')).toBeTruthy();
  });

  it('shows no count pill when there are no unread notifications', async () => {
    installFetch({ 'GET /api/notifications': { body: { notifications: [], unread: 0 } } });
    render(
      <AppShell role="member" displayName="Ana" branding={BRANDING}>
        <div>conteúdo</div>
      </AppShell>,
    );

    // Bell present, but the aria-label has no count and no pill text.
    await waitFor(() => expect(screen.getByLabelText('Notificações')).toBeTruthy());
  });
});
