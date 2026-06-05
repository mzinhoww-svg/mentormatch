import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { OnboardingWizard, type OnboardingContext } from '../views/OnboardingWizard.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

const CTX: OnboardingContext = {
  displayName: 'Ana Souza',
  firstName: 'Ana',
  email: 'ana@acme.com',
  company: 'Acme',
  avatarUrl: null,
  title: null,
  bio: null,
  linkedinUrl: null,
  languages: [],
  contactWhatsapp: null,
  whatsappPublic: false,
};

const CATALOG = { skills: [{ id: '1', name: 'Liderança' }, { id: '2', name: 'Comunicação' }] };

describe('OnboardingWizard (first-login flow)', () => {
  it('walks mentor → profile → skills → finish and commits the right payload', async () => {
    const mock = installFetch({
      'GET /api/skills': { body: CATALOG },
      'POST /api/profile/onboarding': { body: { ok: true, profile: {} } },
    });
    render(<OnboardingWizard context={CTX} />);

    // Etapa 0: welcome + intention.
    expect(screen.getByText(/Bem-vindo\(a\) ao seu MentorMatch, Ana/)).toBeTruthy();
    expect(screen.getByText('ana@acme.com')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Compartilhe seu conhecimento/i }));

    // Etapa 1: essential profile (name prefilled). Add a language.
    expect(await screen.findByText(/Complete seu perfil/i)).toBeTruthy();
    expect((screen.getByLabelText('Nome de exibição') as HTMLInputElement).value).toBe('Ana Souza');
    fireEvent.change(screen.getByLabelText('Cargo / função'), { target: { value: 'Product Manager' } });
    const langs = screen.getByLabelText('Idiomas que você fala');
    fireEvent.change(langs, { target: { value: 'Português' } });
    fireEvent.keyDown(langs, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    // Etapa 2: mentor-specific skills prompt. Add a catalog skill.
    expect(await screen.findByText(/Quais habilidades você pode compartilhar/i)).toBeTruthy();
    const skillInput = screen.getByLabelText('Habilidades que você compartilha');
    fireEvent.change(skillInput, { target: { value: 'Liderança' } });
    fireEvent.keyDown(skillInput, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar perfil/i }));

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/profile/onboarding')).toBe(true));
    const call = mock.calls.find((c) => c.method === 'POST' && c.path === '/api/profile/onboarding');
    expect(call?.body).toMatchObject({
      intention: 'mentor',
      displayName: 'Ana Souza',
      title: 'Product Manager',
      languages: ['Português'],
      skills: [{ name: 'Liderança' }],
    });

    // Etapa 3: done screen with a completeness score.
    expect(await screen.findByText(/Seu perfil está pronto/i)).toBeTruthy();
    expect(screen.getByText(/Perfil \d+% completo/)).toBeTruthy();
  });

  it('adapts the skills step for the mentee path', async () => {
    installFetch({
      'GET /api/skills': { body: CATALOG },
      'POST /api/profile/onboarding': { body: { ok: true, profile: {} } },
    });
    render(<OnboardingWizard context={CTX} />);

    fireEvent.click(screen.getByRole('button', { name: /Explorar como mentorado/i }));
    expect(await screen.findByText(/Complete seu perfil/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText(/O que você busca aprender/i)).toBeTruthy();
  });
});
