import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SignupForm } from '../SignupForm.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

const BRANDING = {
  displayName: 'Acme Corp',
  logoUrl: null,
  primaryColor: '#0A0A0A',
  secondaryColor: '#1B5C4C',
  inkColor: '#14100D',
  paperColor: '#FBF7F0',
  programName: 'Mentoria Acme',
  locale: 'pt-BR',
};

describe('SignupForm', () => {
  it('signs up (consent + same-origin POST) when enabled', async () => {
    const mock = installFetch({
      'GET /api/branding': { body: { branding: BRANDING, allowSelfSignup: true } },
      'POST /api/auth/signup': { body: { ok: true, role: 'member' }, status: 201 },
    });
    try {
      vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    } catch {
      /* happy-dom may not allow; assertion below doesn't depend on it */
    }

    render(<SignupForm />);
    expect(await screen.findByText('Acme Corp')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@acme.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/auth/signup')).toBe(true));
    const post = mock.calls.find((c) => c.path === '/api/auth/signup');
    expect(post?.body).toMatchObject({
      email: 'ana@acme.com',
      password: 'secret123',
      displayName: 'Ana',
      consent: true,
    });
    expect(post?.url.startsWith('/api/')).toBe(true);
  });

  it('blocks submit without consent (no request)', async () => {
    const mock = installFetch({
      'GET /api/branding': { body: { branding: BRANDING, allowSelfSignup: true } },
      'POST /api/auth/signup': { body: { ok: true } },
    });
    render(<SignupForm />);
    await screen.findByText('Acme Corp');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByText(/aceitar os termos/i)).toBeTruthy();
    expect(calledWith(mock, 'POST', '/api/auth/signup')).toBe(false);
  });

  it('shows the disabled message when self-signup is off', async () => {
    installFetch({ 'GET /api/branding': { body: { branding: BRANDING, allowSelfSignup: false } } });
    render(<SignupForm />);
    expect(await screen.findByText(/cadastro está desabilitado/i)).toBeTruthy();
    expect(screen.queryByLabelText('E-mail')).toBeNull();
  });
});
