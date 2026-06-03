import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { WorkspaceEntry } from '../WorkspaceEntry.js';

afterEach(cleanup);

describe('WorkspaceEntry (root /login)', () => {
  it('redirects to the tenant login host for a valid slug', async () => {
    const assign = vi.fn();
    // happy-dom: make location.host/protocol/assign observable.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { host: 'mentorxmatch.xyz', protocol: 'https:', assign },
    });

    render(<WorkspaceEntry />);
    expect(screen.getByText('Entrar na sua empresa')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Identificador da empresa'), { target: { value: 'acme' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://acme.mentorxmatch.xyz/login'));
  });

  it('shows an error and does not redirect for an invalid slug', () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { host: 'mentorxmatch.xyz', protocol: 'https:', assign },
    });
    render(<WorkspaceEntry />);
    fireEvent.change(screen.getByLabelText('Identificador da empresa'), { target: { value: '-bad' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/identificador válido/i)).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });
});
