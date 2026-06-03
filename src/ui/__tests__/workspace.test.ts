import { describe, it, expect } from 'vitest';
import { buildWorkspaceLoginUrl, isValidWorkspaceSlug, normalizeSlug } from '../workspace.js';

describe('workspace slug', () => {
  it('normalizes and validates', () => {
    expect(normalizeSlug('  ACME ')).toBe('acme');
    expect(isValidWorkspaceSlug('acme')).toBe(true);
    expect(isValidWorkspaceSlug('company-one')).toBe(true);
    expect(isValidWorkspaceSlug('-bad')).toBe(false);
    expect(isValidWorkspaceSlug('a b')).toBe(false);
    expect(isValidWorkspaceSlug('')).toBe(false);
  });
});

describe('buildWorkspaceLoginUrl', () => {
  it('builds the tenant login URL for prod and dev hosts', () => {
    expect(buildWorkspaceLoginUrl('mentorxmatch.xyz', 'https:', 'ACME')).toBe(
      'https://acme.mentorxmatch.xyz/login',
    );
    expect(buildWorkspaceLoginUrl('localhost:3000', 'http:', 'acme')).toBe(
      'http://acme.localhost:3000/login',
    );
  });
  it('strips a leading www. so we never produce acme.www...', () => {
    expect(buildWorkspaceLoginUrl('www.mentorxmatch.xyz', 'https:', 'acme')).toBe(
      'https://acme.mentorxmatch.xyz/login',
    );
  });
  it('returns null for an invalid slug', () => {
    expect(buildWorkspaceLoginUrl('mentorxmatch.xyz', 'https:', '-nope')).toBeNull();
  });
});
