import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  isValidCustomDomain,
  verifyRecordName,
  verifyRecordValue,
  VERIFY_RECORD_PREFIX,
} from '../customDomain.js';

describe('normalizeDomain', () => {
  it('lowercases and strips scheme/path/port/trailing dot', () => {
    expect(normalizeDomain('HTTPS://Mentoria.Acme.com/login')).toBe('mentoria.acme.com');
    expect(normalizeDomain('mentoria.acme.com:443')).toBe('mentoria.acme.com');
    expect(normalizeDomain('mentoria.acme.com.')).toBe('mentoria.acme.com');
    expect(normalizeDomain('  ACME.COM  ')).toBe('acme.com');
    expect(normalizeDomain(null)).toBe('');
    expect(normalizeDomain(undefined)).toBe('');
  });
});

describe('isValidCustomDomain', () => {
  it('accepts multi-label FQDNs', () => {
    expect(isValidCustomDomain('mentoria.acme.com')).toBe(true);
    expect(isValidCustomDomain('acme.io')).toBe(true);
    expect(isValidCustomDomain('a.b.c.example.co')).toBe(true);
  });
  it('rejects single labels, bad chars and junk', () => {
    expect(isValidCustomDomain('localhost')).toBe(false);
    expect(isValidCustomDomain('acme')).toBe(false);
    expect(isValidCustomDomain('-acme.com')).toBe(false);
    expect(isValidCustomDomain('acme-.com')).toBe(false);
    expect(isValidCustomDomain('acme..com')).toBe(false);
    expect(isValidCustomDomain('http://')).toBe(false);
    expect(isValidCustomDomain('')).toBe(false);
  });
});

describe('verification record spec', () => {
  it('builds the TXT record name and value', () => {
    expect(verifyRecordName('Mentoria.Acme.com')).toBe(`${VERIFY_RECORD_PREFIX}.mentoria.acme.com`);
    expect(verifyRecordValue('abc123')).toBe('mentormatch-domain-verification=abc123');
  });
});
