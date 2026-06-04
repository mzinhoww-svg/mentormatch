import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ProfileView } from '../views/ProfileView.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

const PROFILE = {
  body: {
    profile: { bio: 'oi', title: 'Eng', area: 'Plataforma', seniority: 'Sr', avatarUrl: null, linkedinUrl: null, status: 'active', mentorAvailable: true, mentorPaused: false },
    contact: { contactEmail: 'a@b.com', contactPhone: null, contactWhatsapp: null, contactPublic: false },
    skills: { offered: [{ id: '1', skillId: 's1', name: 'React', relation: 'offered', level: null }], sought: [], interest: [] },
    goals: [{ id: 'g1', description: 'Crescer' }],
    roles: { isMentor: true, isMentee: false },
  },
};

describe('ProfileView (proof 3: loads & saves)', () => {
  it('loads the profile and saves edits via PUT', async () => {
    const mock = installFetch({
      'GET /api/profile': PROFILE,
      'GET /api/skills': { body: { skills: [{ id: 's2', name: 'Node' }] } },
      'PUT /api/profile': { body: { ok: true, profile: PROFILE.body.profile } },
    });
    render(<ProfileView />);

    // Loaded: existing skill + form value populated (wait for the effect to fill it).
    expect(await screen.findByText('React')).toBeTruthy();
    const title = (await screen.findByDisplayValue('Eng')) as HTMLInputElement;
    expect(title).toBe(screen.getByLabelText('Cargo'));

    fireEvent.change(title, { target: { value: 'Staff Eng' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    await waitFor(() => expect(calledWith(mock, 'PUT', '/api/profile')).toBe(true));
    const put = mock.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toMatchObject({ title: 'Staff Eng' });
    // Skill editor: offered skill has a remove control.
    expect(screen.getByRole('button', { name: /remover react/i })).toBeTruthy();
  });
});

describe('ProfileView — skill levels (offered)', () => {
  it('shows the level on an offered pill and posts the chosen level when adding', async () => {
    const profile = {
      body: {
        ...PROFILE.body,
        skills: {
          offered: [{ id: '1', skillId: 's1', name: 'React', relation: 'offered', level: 'pleno' }],
          sought: [],
          interest: [],
        },
      },
    };
    const mock = installFetch({
      'GET /api/profile': profile,
      'GET /api/skills': { body: { skills: [{ id: 's2', name: 'Node' }] } },
      'POST /api/profile/skills': { status: 201, body: { ok: true, userSkill: {} } },
    });
    const { container } = render(<ProfileView />);

    // Existing offered skill renders its level label on the pill itself.
    await screen.findByText('React');
    expect(container.querySelector('.skill-pill.offered .skill-lvl')?.textContent).toBe('Pleno');

    // Choose a level, type a new skill, press Enter to add it.
    fireEvent.change(screen.getByLabelText(/Nível/), { target: { value: 'avancado' } });
    const input = screen.getByLabelText('Adicionar habilidade (Habilidades que ofereço)');
    fireEvent.change(input, { target: { value: 'Go' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/profile/skills')).toBe(true));
    const post = mock.calls.find((c) => c.method === 'POST' && c.path === '/api/profile/skills');
    expect(post?.body).toMatchObject({ name: 'Go', relation: 'offered', level: 'avancado' });
  });

  it('does not offer a level selector for sought skills', async () => {
    installFetch({
      'GET /api/profile': PROFILE,
      'GET /api/skills': { body: { skills: [] } },
    });
    render(<ProfileView />);
    await screen.findByText('React');
    // Exactly one "Nível" selector exists — the offered one (not the sought editor).
    expect(screen.getAllByLabelText(/Nível/)).toHaveLength(1);
  });
});

describe('ProfileView (proof 9: no protected data without auth)', () => {
  it('shows an error and not the form when the API rejects (401)', async () => {
    installFetch({
      'GET /api/profile': { status: 401, body: { error: 'UNAUTHORIZED', message: 'no_session' } },
      'GET /api/skills': { body: { skills: [] } },
    });
    render(<ProfileView />);
    expect(await screen.findByText('no_session')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /salvar perfil/i })).toBeNull();
  });
});
