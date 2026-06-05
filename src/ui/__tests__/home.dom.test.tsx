import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HomeView } from '../views/HomeView.js';
import { installFetch } from './fetchMock.js';

afterEach(cleanup);

const PROFILE = {
  profile: { avatarUrl: null, title: 'PM', bio: 'oi', linkedinUrl: null, languages: [], mentorAvailable: false },
  contact: { contactWhatsapp: null },
  skills: { offered: [], sought: [] },
  roles: { isMentor: false, isMentee: false },
};

describe('HomeView (personal dashboard)', () => {
  it('greets by name and surfaces pending requests as the next step', async () => {
    installFetch({
      'GET /api/profile': { body: PROFILE },
      'GET /api/mentors': { body: { items: [{ tenantUserId: 'm1', displayName: 'Bruno Reis', title: 'Eng', avatarUrl: null, offeredSkills: ['React'] }] } },
      'GET /api/notifications': { body: { unread: 2 } },
      'GET /api/mentorship/mentorships': { body: { mentorships: [] } },
      'GET /api/mentorship/requests': { body: { asMentor: [{ status: 'pending' }], asMentee: [] } },
    });
    render(<HomeView displayName="Ana Souza" />);

    // Personalized greeting (first name).
    expect(await screen.findByText(/,\s*Ana/)).toBeTruthy();
    // Next-step prioritizes the pending request.
    expect(await screen.findByText(/aguarda você/)).toBeTruthy();
    expect(screen.getByText('Responder')).toBeTruthy();
    // Recommendations render with the mentor.
    expect(screen.getByText('Bruno Reis')).toBeTruthy();
  });

  it('nudges an empty profile toward finding a mentor', async () => {
    installFetch({
      'GET /api/profile': {
        body: { ...PROFILE, roles: { isMentor: false, isMentee: true } },
      },
      'GET /api/mentors': { body: { items: [] } },
      'GET /api/notifications': { body: { unread: 0 } },
      'GET /api/mentorship/mentorships': { body: { mentorships: [] } },
      'GET /api/mentorship/requests': { body: { asMentor: [], asMentee: [] } },
    });
    render(<HomeView displayName="Marco" />);
    expect(await screen.findByText(/Encontre o mentor certo/)).toBeTruthy();
    expect(screen.getByText('Explorar mentores')).toBeTruthy();
  });
});
