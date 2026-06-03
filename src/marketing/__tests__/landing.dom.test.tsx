import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import HomePage from '../../app/(marketing)/page.js';
import { MarketingNav } from '../MarketingNav.js';
import { DemoForm } from '../DemoForm.js';
import { installFetch, calledWith } from '../../ui/__tests__/fetchMock.js';

afterEach(cleanup);

describe('Home (renders + branding applied)', () => {
  it('renders the value proposition, brand symbol and primary CTA', () => {
    render(<HomePage />);
    expect(screen.getByText('Ele circula.')).toBeTruthy();
    // Approved "A Corrente" symbol (not a monogram) is present.
    expect(screen.getAllByLabelText('MentorMatch').length).toBeGreaterThan(0);
    // Primary CTA appears.
    expect(screen.getAllByRole('link', { name: /solicitar demonstração/i }).length).toBeGreaterThan(0);
  });
});

describe('Navigation', () => {
  it('renders the marketing nav links and CTAs', () => {
    render(<MarketingNav />);
    expect(screen.getByRole('link', { name: 'Como Funciona' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Planos' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Contato' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /entrar/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /solicitar demonstração/i })).toBeTruthy();
  });
});

describe('Demo form (works)', () => {
  it('submits the lead and shows success', async () => {
    const mock = installFetch({ 'POST /api/demo-request': { body: { ok: true } } });
    render(<DemoForm />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'Head de RH' } });
    fireEvent.change(screen.getByLabelText('E-mail corporativo'), { target: { value: 'ana@acme.com' } });
    fireEvent.change(screen.getByLabelText('Número de colaboradores'), { target: { value: '51–200' } });
    fireEvent.click(screen.getByRole('button', { name: /solicitar demonstração/i }));

    await waitFor(() => expect(calledWith(mock, 'POST', '/api/demo-request')).toBe(true));
    expect(await screen.findByTestId('demo-success')).toBeTruthy();
    const call = mock.calls.find((c) => c.path === '/api/demo-request');
    expect(call?.body).toMatchObject({ company: 'Acme', headcount: '51–200' });
  });
});
