import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

describe('LoginForm (proof 1: login renders & respects tenant)', () => {
  it('themes from the host tenant branding and posts to the same-origin login', async () => {
    const mock = installFetch({
      'GET /api/branding': {
        body: {
          branding: {
            displayName: 'Acme Corp',
            logoUrl: null,
            primaryColor: '#0A0A0A',
            secondaryColor: '#1B5C4C',
            inkColor: '#14100D',
            paperColor: '#FBF7F0',
            programName: 'Mentoria Acme',
            locale: 'pt-BR',
          },
        },
      },
      'POST /api/auth/login': { body: { ok: true, role: 'member' } },
    });
    try {
      vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    } catch {
      /* happy-dom may not allow; the assertion below doesn't depend on it */
    }

    render(<LoginForm />);
    // Tenant branding (display name) is rendered.
    expect(await screen.findByText('Acme Corp')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'u@acme.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/auth/login')).toBe(true));
    const login = mock.calls.find((c) => c.path === '/api/auth/login');
    expect(login?.body).toMatchObject({ email: 'u@acme.com', password: 'secret123' });
    // Same-origin relative path only (no cross-tenant origin).
    expect(login?.url.startsWith('/api/')).toBe(true);
  });

  it('offers a self-serve "forgot password" link', async () => {
    installFetch({
      'GET /api/branding': {
        body: {
          branding: {
            displayName: 'Acme Corp',
            logoUrl: null,
            primaryColor: '#0A0A0A',
            secondaryColor: '#1B5C4C',
            inkColor: '#14100D',
            paperColor: '#FBF7F0',
            programName: 'Mentoria Acme',
            locale: 'pt-BR',
          },
        },
      },
    });
    render(<LoginForm />);
    const link = await screen.findByRole('link', { name: /esqueci minha senha/i });
    expect(link.getAttribute('href')).toBe('/forgot-password');
  });
});
