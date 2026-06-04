import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from '../ForgotPasswordForm.js';
import { installFetch, calledWith } from './fetchMock.js';

afterEach(cleanup);

const BRANDING = {
  branding: {
    displayName: 'Acme Corp',
    logoUrl: null,
    primaryColor: '#0A0A0A',
    secondaryColor: '#1B5C4C',
    inkColor: '#14100D',
    paperColor: '#FBF7F0',
    programName: 'Mentoria Acme',
    locale: 'pt-BR',
    fontFamily: null,
    borderRadius: null,
  },
};

describe('ForgotPasswordForm', () => {
  it('posts the email and shows a non-enumerating confirmation', async () => {
    const mock = installFetch({
      'GET /api/branding': { body: BRANDING },
      'POST /api/auth/password-reset/request': { body: { ok: true } },
    });
    render(<ForgotPasswordForm />);

    expect(await screen.findByText('Acme Corp')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'someone@acme.test' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }));

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/auth/password-reset/request')).toBe(true));
    const call = mock.calls.find((c) => c.path === '/api/auth/password-reset/request');
    expect(call?.body).toMatchObject({ email: 'someone@acme.test' });
    expect(call?.url.startsWith('/api/')).toBe(true);
    // Confirmation is the SAME regardless of whether the account exists.
    expect(await screen.findByText(/Se houver uma conta com esse e-mail/)).toBeTruthy();
  });

  it('still confirms even if the request errors (no account enumeration)', async () => {
    installFetch({
      'GET /api/branding': { body: BRANDING },
      'POST /api/auth/password-reset/request': { status: 500, body: { error: 'ERROR', message: 'boom' } },
    });
    render(<ForgotPasswordForm />);

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'x@acme.test' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }));

    expect(await screen.findByText(/Se houver uma conta com esse e-mail/)).toBeTruthy();
  });
});
