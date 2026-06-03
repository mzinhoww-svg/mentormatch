import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SetPasswordForm } from '../SetPasswordForm.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

const BRANDING = {
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
};

describe('SetPasswordForm', () => {
  it('validates, posts the token to the same-origin confirm endpoint, then confirms success', async () => {
    const mock = installFetch({
      ...BRANDING,
      'POST /api/auth/password-reset/confirm': { body: { ok: true } },
    });

    render(<SetPasswordForm token="tok.abc" />);
    expect(await screen.findByText('Acme Corp')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /definir senha/i }));

    await waitFor(() =>
      expect(calledWith(mock, 'POST', '/api/auth/password-reset/confirm')).toBe(true),
    );
    const post = mock.calls.find((c) => c.path === '/api/auth/password-reset/confirm');
    expect(post?.body).toMatchObject({ token: 'tok.abc', password: 'secret123' });
    expect(post?.url.startsWith('/api/')).toBe(true); // same-origin only

    // Success state replaces the form with a login link.
    expect(await screen.findByText(/já pode entrar/i)).toBeTruthy();
  });

  it('blocks mismatched passwords client-side (no request sent)', async () => {
    const mock = installFetch({
      ...BRANDING,
      'POST /api/auth/password-reset/confirm': { body: { ok: true } },
    });

    render(<SetPasswordForm token="tok.abc" />);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'secret124' } });
    fireEvent.click(screen.getByRole('button', { name: /definir senha/i }));

    expect(await screen.findByText(/não coincidem/i)).toBeTruthy();
    expect(calledWith(mock, 'POST', '/api/auth/password-reset/confirm')).toBe(false);
  });

  it('shows an error when the token is missing (no form rendered)', async () => {
    installFetch({ ...BRANDING });
    render(<SetPasswordForm token="" />);
    expect(await screen.findByText(/token ausente/i)).toBeTruthy();
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
  });
});
